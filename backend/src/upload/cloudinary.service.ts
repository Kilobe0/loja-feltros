import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

// Armazenamento de imagens na nuvem. O filesystem do host de produção é
// efêmero (ex.: Fly), então uploads em disco se perdem a cada deploy/restart —
// o Cloudinary é a origem persistente das imagens dos produtos.
@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  get isConfigured(): boolean {
    return Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET,
    );
  }

  uploadImage(buffer: Buffer): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'loja-feltros/produtos', resource_type: 'image' },
        (error, result) => {
          if (error || !result) {
            return reject(
              new InternalServerErrorException(
                `Falha no upload para o Cloudinary: ${error?.message ?? 'sem resposta'}`,
              ),
            );
          }
          resolve(result);
        },
      );
      stream.end(buffer);
    });
  }
}
