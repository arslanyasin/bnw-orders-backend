import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '@modules/users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoggerService } from '@shared/logger/logger.service';
import { UserRole } from '@common/interfaces/user-role.enum';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private logger: LoggerService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return null;
    }

    // Check if account is locked
    if (user.isLocked) {
      throw new UnauthorizedException(
        'Account is temporarily locked due to multiple failed login attempts',
      );
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      await this.usersService.incrementLoginAttempts(user._id.toString());
      return null;
    }

    // Reset login attempts on successful login
    await this.usersService.resetLoginAttempts(user._id.toString());

    const { password: _, ...result } = user.toJSON();
    return result;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user);

    // Save refresh token
    // await this.usersService.updateRefreshToken(user._id, tokens.refreshToken);

    try {
      this.logger.audit('USER_LOGIN', user._id, { email: user.email }, 'AuthService');
    } catch (auditError) {
      // Log audit error but don't fail the login
      this.logger.error('Audit logging failed', auditError.stack, 'AuthService');
    }

    return {
      user,
      ...tokens,
    };
  }

  async register(registerDto: RegisterDto) {
    try {
      // Default role is STAFF, only admins can create other roles
      const user = await this.usersService.create({
        ...registerDto,
        role: UserRole.STAFF,
      });

      const tokens = await this.generateTokens(user);

      await this.usersService.updateRefreshToken(
        user._id.toString(),
        tokens.refreshToken,
      );

      try {
        this.logger.audit(
          'USER_REGISTERED',
          user._id.toString(),
          { email: user.email },
          'AuthService',
        );
      } catch (auditError) {
        // Log audit error but don't fail the registration
        this.logger.error('Audit logging failed', auditError.stack, 'AuthService');
      }

      return {
        user,
        ...tokens,
      };
    } catch (error) {
      console.log('error', error);
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Registration failed');
    }
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.usersService.findOne(userId);

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Access denied');
    }

    try {
      await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (user.refreshToken !== refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens(user);
    await this.usersService.updateRefreshToken(user._id.toString(), tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
    this.logger.audit('USER_LOGOUT', userId, {}, 'AuthService');
    return { message: 'Logged out successfully' };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(forgotPasswordDto.email);

    if (!user) {
      // Don't reveal if user exists or not (security best practice)
      return {
        message:
          'If an account with that email exists, a password reset link has been sent.',
      };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set token and expiration (1 hour)
    await this.usersService.setPasswordResetToken(
      user._id.toString(),
      hashedToken,
      new Date(Date.now() + 60 * 60 * 1000),
    );

    this.logger.audit(
      'PASSWORD_RESET_REQUESTED',
      user._id.toString(),
      { email: user.email },
      'AuthService',
    );

    // TODO: Send email with reset link
    // const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    // await this.emailService.sendPasswordResetEmail(user.email, resetUrl);

    return {
      message:
        'If an account with that email exists, a password reset link has been sent.',
      // In development, return the token (remove in production!)
      ...(process.env.NODE_ENV === 'development' && { resetToken }),
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    // Hash the token from the request
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetPasswordDto.token)
      .digest('hex');

    // Find user with valid reset token
    const user = await this.usersService.findByResetToken(hashedToken);

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Update password
    await this.usersService.updatePassword(
      user._id.toString(),
      resetPasswordDto.newPassword,
    );

    // Clear reset token
    await this.usersService.clearPasswordResetToken(user._id.toString());

    this.logger.audit(
      'PASSWORD_RESET_COMPLETED',
      user._id.toString(),
      { email: user.email },
      'AuthService',
    );

    return { message: 'Password has been reset successfully' };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.usersService.findOne(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isValidPassword = await user.comparePassword(
      changePasswordDto.currentPassword,
    );

    if (!isValidPassword) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Update to new password
    await this.usersService.updatePassword(userId, changePasswordDto.newPassword);

    this.logger.audit(
      'PASSWORD_CHANGED',
      userId,
      { email: user.email },
      'AuthService',
    );

    return { message: 'Password changed successfully' };
  }

  private async generateTokens(user: any) {
    const payload = {
      sub: user._id,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: this.configService.get<string>('jwt.accessExpiration'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiration'),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}
