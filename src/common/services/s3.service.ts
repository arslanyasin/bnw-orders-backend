import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucketName = 'sz-dev';
  private region = 'us-east-1';

  constructor() {
    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }

  /**
   * Upload a file to S3 bucket
   * @param buffer - File buffer to upload
   * @param key - S3 object key (file path in bucket)
   * @param contentType - MIME type of the file
   * @returns S3 URL of the uploaded file
   */
  async uploadFile(
    buffer: Buffer,
    key: string,
    contentType: string = 'application/pdf',
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      // Make the file publicly readable
      ACL: 'public-read',
    });

    await this.s3Client.send(command);

    // Return the public URL
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
  }

  /**
   * Upload delivery challan PDF to S3
   * @param pdfBuffer - PDF file buffer
   * @param challanNumber - Delivery challan number (used for filename)
   * @returns S3 URL of the uploaded PDF
   */
  async uploadDeliveryChallanPDF(
    pdfBuffer: Buffer,
    challanNumber: string,
  ): Promise<string> {
    const key = `delivery-challans/${challanNumber}.pdf`;
    return this.uploadFile(pdfBuffer, key, 'application/pdf');
  }
}
