import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Admin, AdminDocument } from './admin.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password: string): Promise<{ access_token: string; admin: { name: string; email: string } }> {
    const admin = await this.adminModel.findOne({ email }).exec();
    if (!admin) throw new UnauthorizedException('Credenciais inválidas');
    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');
    const payload = { sub: admin._id, email: admin.email };
    return {
      access_token: this.jwtService.sign(payload),
      admin: { name: admin.name, email: admin.email },
    };
  }

  async createAdmin(name: string, email: string, password: string): Promise<AdminDocument> {
    const existing = await this.adminModel.findOne({ email }).exec();
    if (existing) return existing;
    const passwordHash = await bcrypt.hash(password, 10);
    return this.adminModel.create({ name, email, passwordHash });
  }

  async validateById(id: string): Promise<AdminDocument | null> {
    return this.adminModel.findById(id).exec();
  }
}
