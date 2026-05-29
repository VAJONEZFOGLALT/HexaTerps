import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { CategoriesController } from './categories.controller';
import { AdminCategoriesController } from './admin-categories.controller';
import { CategoriesService } from './categories.service';

@Module({
  imports: [AdminModule],
  controllers: [CategoriesController, AdminCategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
