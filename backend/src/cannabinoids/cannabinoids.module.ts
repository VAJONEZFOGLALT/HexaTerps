import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { CannabinoidsController } from './cannabinoids.controller';
import { AdminCannabinoidsController } from './admin-cannabinoids.controller';
import { CannabinoidsService } from './cannabinoids.service';

@Module({
  imports: [AdminModule],
  controllers: [CannabinoidsController, AdminCannabinoidsController],
  providers: [CannabinoidsService],
  exports: [CannabinoidsService],
})
export class CannabinoidsModule {}
