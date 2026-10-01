import { categoryRepository } from '../repositories/categoryRepository.js';

export class CategoryService {
  async listCategories(businessId: string, params?: { search?: string; isActive?: boolean }) {
    return categoryRepository.list(businessId, params);
  }

  async getCategory(id: string, businessId: string) {
    const category = await categoryRepository.findById(id, businessId);
    if (!category) {
      throw new Error('Product category not found');
    }
    return category;
  }

  async createCategory(businessId: string, data: { name: string; description?: string; isActive?: boolean }) {
    const trimmedName = data.name.trim();
    const existing = await categoryRepository.findByName(trimmedName, businessId);
    if (existing) {
      throw new Error(`Category "${trimmedName}" already exists for this business`);
    }

    return categoryRepository.create({
      business: { connect: { id: businessId } },
      name: trimmedName,
      description: data.description?.trim() || null,
      isActive: data.isActive !== undefined ? data.isActive : true,
    });
  }

  async updateCategory(
    id: string,
    businessId: string,
    data: { name?: string; description?: string; isActive?: boolean }
  ) {
    const category = await categoryRepository.findById(id, businessId);
    if (!category) {
      throw new Error('Product category not found');
    }

    if (data.name && data.name.trim().toLowerCase() !== category.name.toLowerCase()) {
      const existing = await categoryRepository.findByName(data.name.trim(), businessId);
      if (existing && existing.id !== id) {
        throw new Error(`Category "${data.name.trim()}" already exists`);
      }
    }

    return categoryRepository.update(id, businessId, {
      ...(data.name ? { name: data.name.trim() } : {}),
      ...(data.description !== undefined ? { description: data.description.trim() || null } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    });
  }

  async deleteCategory(id: string, businessId: string) {
    const category = await categoryRepository.findById(id, businessId);
    if (!category) {
      throw new Error('Product category not found');
    }

    // Check if category has associated products
    const productCount = (category as any)._count?.products || 0;
    if (productCount > 0) {
      // Soft-delete / deactivate category to preserve product associations
      return categoryRepository.update(id, businessId, { isActive: false });
    }

    return categoryRepository.delete(id, businessId);
  }
}

export const categoryService = new CategoryService();
