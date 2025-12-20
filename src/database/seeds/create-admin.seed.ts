import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { UsersService } from '@modules/users/users.service';
import { UserRole } from '@common/interfaces/user-role.enum';

async function createAdminUser() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  try {
    // Check if admin already exists
    const existingAdmin = await usersService.findByEmail('admin@bank.com');

    if (existingAdmin) {
      console.log('✅ Admin user already exists!');
      console.log('Email: admin@bank.com');
      await app.close();
      return;
    }

    // Create admin user
    const admin = await usersService.create({
      email: 'admin@bank.com',
      password: 'Admin123!',
      firstName: 'System',
      lastName: 'Admin',
      role: UserRole.ADMIN,
    });

    console.log('✅ Admin user created successfully!');
    console.log('-----------------------------------');
    console.log('Email: admin@bank.com');
    console.log('Password: Admin123!');
    console.log('Role: admin');
    console.log('-----------------------------------');
    console.log('⚠️  Please change the password after first login!');
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  }

  await app.close();
}

createAdminUser();
