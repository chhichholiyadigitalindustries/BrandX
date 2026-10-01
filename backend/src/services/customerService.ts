import { customerRepository } from '../repositories/customerRepository.js';

export class CustomerService {
  async listCustomers(
    businessId: string,
    params: {
      page: number;
      limit: number;
      search?: string;
      status?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ) {
    return customerRepository.list(businessId, params);
  }

  async getCustomer(customerId: string, businessId: string) {
    const customer = await customerRepository.findById(customerId, businessId);
    if (!customer) throw new Error('Customer not found');
    return customer;
  }

  async createCustomer(businessId: string, data: any) {
    const mobile = data.mobile || data.phone;
    if (!mobile) {
      throw new Error('Customer mobile number is required');
    }

    const existing = await customerRepository.findByMobile(mobile, businessId);
    if (existing) {
      throw new Error('A customer with this mobile number already exists in your digital khata');
    }

    const openingBalance = Number(data.openingBalance) || Number(data.balance) || 0;

    return customerRepository.create({
      business: { connect: { id: businessId } },
      name: data.name,
      mobile: mobile,
      phone: mobile,
      email: data.email || null,
      address: data.address || null,
      gstin: data.gstin || null,
      notes: data.notes || null,
      openingBalance,
      balance: openingBalance,
      currentBalance: openingBalance,
      status: data.status || 'ACTIVE',
    });
  }

  async updateCustomer(customerId: string, businessId: string, data: any) {
    const customer = await customerRepository.findById(customerId, businessId);
    if (!customer) throw new Error('Customer not found');

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.mobile !== undefined || data.phone !== undefined) {
      const mobile = data.mobile || data.phone;
      if (mobile !== customer.mobile) {
        const existing = await customerRepository.findByMobile(mobile, businessId);
        if (existing && existing.id !== customerId) {
          throw new Error('A customer with this mobile number already exists');
        }
      }
      updateData.mobile = mobile;
      updateData.phone = mobile;
    }
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.address !== undefined) updateData.address = data.address || null;
    if (data.gstin !== undefined) updateData.gstin = data.gstin || null;
    if (data.notes !== undefined) updateData.notes = data.notes || null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.openingBalance !== undefined) {
      updateData.openingBalance = Number(data.openingBalance);
    }

    return customerRepository.update(customerId, businessId, updateData);
  }

  async deleteCustomer(customerId: string, businessId: string) {
    const customer = await customerRepository.findById(customerId, businessId);
    if (!customer) throw new Error('Customer not found');

    return customerRepository.delete(customerId, businessId);
  }
}

export const customerService = new CustomerService();
