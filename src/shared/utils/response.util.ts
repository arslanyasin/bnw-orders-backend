export class ApiResponse<T> {
  constructor(
    public statusCode: number,
    public message: string,
    public data?: T,
  ) {}

  static success<T>(data: T, message = 'Success'): ApiResponse<T> {
    return new ApiResponse(200, message, data);
  }

  static created<T>(data: T, message = 'Created successfully'): ApiResponse<T> {
    return new ApiResponse(201, message, data);
  }

  static error(message: string, statusCode = 500): ApiResponse<null> {
    return new ApiResponse(statusCode, message, null);
  }
}
