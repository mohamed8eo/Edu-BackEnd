import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CategorieService } from './categorie.service';
import { AddCategorieDto } from './dto/addCategorie.dto';
import { UpdateCategorieDto } from './dto/updateCategorie.dto';
import type { Request } from 'express';
import { AdminGuard } from 'src/auth/guards/admin-guard/admin-guard.guard';
@Controller('categorie')
export class CategorieController {
  constructor(private readonly categorieService: CategorieService) {}
  /*
  categorie/add post
  categorie/update/:slug update
  categorie/delete/:slug Delete
  categorie/:slug Get
  categorie/tree Get
  categorie Get all Parent Categories
 */
  @UseGuards(AdminGuard)
  @Post()
  async addCategorie(@Body() addCategorie: AddCategorieDto) {
    return await this.categorieService.addCategorie(addCategorie);
  }

  @UseGuards(AdminGuard)
  @Patch('update/:slug')
  async updateCategorie(
    @Param('slug') slug: string,
    @Body() updateCategorie: UpdateCategorieDto,
  ) {
    return await this.categorieService.updateCategorie(slug, updateCategorie);
  }

  @UseGuards(AdminGuard)
  @Delete('delete/:slug')
  async deleteCategorie(@Param('slug') slug: string) {
    return await this.categorieService.deleteCategorie(slug);
  }

  @Get('tree')
  getTree() {
    return this.categorieService.getTree();
  }

  @Get(':slug')
  async getCategorie(@Param('slug') slug: string) {
    return await this.categorieService.getCategorie(slug);
  }

  @Get(':slug/children')
  async getParentChildren(@Param('slug') slug: string) {
    return await this.categorieService.getParentChildren(slug);
  }

  @Get()
  async getAllParentCategories() {
    return await this.categorieService.getAllParentCategories();
  }

  @Get(':slug/courses')
  getCourses(@Param('slug') slug: string) {
    return this.categorieService.getCoursesByCategorySlug(slug);
  }
}
