// services/customerService.js
import { dbUtils } from './firebase';
import { DB_PATHS } from '../utils/constants';

export const customerService = {
  // Create new customer with detailed information
  createCustomer: async (customerData) => {
    try {
      const currentDate = dbUtils.dateString();
      const timestamp = dbUtils.timestamp();

      // Generate customer ID using phone number as primary key
      const customerId = customerData.phone;

      // Prepare customer entry with enhanced structure
      const customerEntry = {
        // Basic Information
        name: customerData.name,
        phone: customerData.phone,
        email: customerData.email || '',
        business_name: customerData.business_name || '',
        gstin: customerData.gstin || '',
        
        // Location/Sites - Array of locations
        locations: customerData.locations || [],
        
        // Brick rates per location
        brick_rates: customerData.brick_rates || {},
        
        // Sales Statistics
        total_purchases: 0,
        total_amount: 0,
        last_purchase: null,
        
        // Timestamps
        created_date: currentDate,
        updated_date: currentDate,
        created_timestamp: timestamp,
        updated_timestamp: timestamp,
        
        // Status
        status: 'active',
        notes: customerData.notes || ''
      };

      // Check if customer already exists
      const existingResult = await dbUtils.readData(`${DB_PATHS.CUSTOMERS}/${customerId}`);
      if (existingResult.success && existingResult.data) {
        return {
          success: false,
          error: 'Customer with this phone number already exists'
        };
      }

      // Save customer
      const result = await dbUtils.writeData(`${DB_PATHS.CUSTOMERS}/${customerId}`, customerEntry);
      
      if (result.success) {
        return {
          success: true,
          data: { ...customerEntry, id: customerId },
          message: 'Customer created successfully'
        };
      }

      return result;
    } catch (error) {
      console.error('Error creating customer:', error);
      return { success: false, error: error.message };
    }
  },

  // Update existing customer
  updateCustomer: async (customerId, customerData) => {
    try {
      const timestamp = dbUtils.timestamp();
      const currentDate = dbUtils.dateString();

      // Get existing customer data
      const existingResult = await dbUtils.readData(`${DB_PATHS.CUSTOMERS}/${customerId}`);
      if (!existingResult.success || !existingResult.data) {
        return { success: false, error: 'Customer not found' };
      }

      const existingCustomer = existingResult.data;

      // Prepare updated customer entry
      const updatedCustomer = {
        ...existingCustomer,
        name: customerData.name,
        email: customerData.email || '',
        business_name: customerData.business_name || '',
        gstin: customerData.gstin || '',
        locations: customerData.locations || existingCustomer.locations || [],
        brick_rates: customerData.brick_rates || existingCustomer.brick_rates || {},
        notes: customerData.notes || existingCustomer.notes || '',
        updated_date: currentDate,
        updated_timestamp: timestamp
      };

      const result = await dbUtils.writeData(`${DB_PATHS.CUSTOMERS}/${customerId}`, updatedCustomer);
      
      if (result.success) {
        return {
          success: true,
          data: { ...updatedCustomer, id: customerId },
          message: 'Customer updated successfully'
        };
      }

      return result;
    } catch (error) {
      console.error('Error updating customer:', error);
      return { success: false, error: error.message };
    }
  },

  // Add location to customer
  addCustomerLocation: async (customerId, locationData) => {
    try {
      const existingResult = await dbUtils.readData(`${DB_PATHS.CUSTOMERS}/${customerId}`);
      if (!existingResult.success || !existingResult.data) {
        return { success: false, error: 'Customer not found' };
      }

      const customer = existingResult.data;
      const locations = customer.locations || [];
      
      // Generate location ID
      const locationId = `loc_${Date.now()}`;
      
      const newLocation = {
        id: locationId,
        name: locationData.name,
        address: locationData.address,
        contact_person: locationData.contact_person || '',
        contact_phone: locationData.contact_phone || '',
        pincode: locationData.pincode || '',
        state: locationData.state || 'GJ',
        state_code: locationData.state_code || '24',
        created_date: dbUtils.dateString(),
        is_primary: locations.length === 0 // First location is primary
      };

      locations.push(newLocation);

      // Update brick rates if provided
      const brickRates = customer.brick_rates || {};
      if (locationData.brick_rate) {
        brickRates[locationId] = parseFloat(locationData.brick_rate);
      }

      const updateData = {
        ...customer,
        locations,
        brick_rates: brickRates,
        updated_date: dbUtils.dateString(),
        updated_timestamp: dbUtils.timestamp()
      };

      const result = await dbUtils.writeData(`${DB_PATHS.CUSTOMERS}/${customerId}`, updateData);
      
      if (result.success) {
        return {
          success: true,
          data: newLocation,
          message: 'Location added successfully'
        };
      }

      return result;
    } catch (error) {
      console.error('Error adding customer location:', error);
      return { success: false, error: error.message };
    }
  },

  // Update customer location
  updateCustomerLocation: async (customerId, locationId, locationData) => {
    try {
      const existingResult = await dbUtils.readData(`${DB_PATHS.CUSTOMERS}/${customerId}`);
      if (!existingResult.success || !existingResult.data) {
        return { success: false, error: 'Customer not found' };
      }

      const customer = existingResult.data;
      const locations = customer.locations || [];
      const locationIndex = locations.findIndex(loc => loc.id === locationId);

      if (locationIndex === -1) {
        return { success: false, error: 'Location not found' };
      }

      // Update location
      locations[locationIndex] = {
        ...locations[locationIndex],
        ...locationData,
        updated_date: dbUtils.dateString()
      };

      // Update brick rate if provided
      const brickRates = customer.brick_rates || {};
      if (locationData.brick_rate !== undefined) {
        brickRates[locationId] = parseFloat(locationData.brick_rate);
      }

      const updateData = {
        ...customer,
        locations,
        brick_rates: brickRates,
        updated_date: dbUtils.dateString(),
        updated_timestamp: dbUtils.timestamp()
      };

      const result = await dbUtils.writeData(`${DB_PATHS.CUSTOMERS}/${customerId}`, updateData);
      
      if (result.success) {
        return {
          success: true,
          data: locations[locationIndex],
          message: 'Location updated successfully'
        };
      }

      return result;
    } catch (error) {
      console.error('Error updating customer location:', error);
      return { success: false, error: error.message };
    }
  },

  // Delete customer location
  deleteCustomerLocation: async (customerId, locationId) => {
    try {
      const existingResult = await dbUtils.readData(`${DB_PATHS.CUSTOMERS}/${customerId}`);
      if (!existingResult.success || !existingResult.data) {
        return { success: false, error: 'Customer not found' };
      }

      const customer = existingResult.data;
      const locations = customer.locations || [];
      const filteredLocations = locations.filter(loc => loc.id !== locationId);

      if (filteredLocations.length === locations.length) {
        return { success: false, error: 'Location not found' };
      }

      // Remove brick rate for this location
      const brickRates = customer.brick_rates || {};
      delete brickRates[locationId];

      const updateData = {
        ...customer,
        locations: filteredLocations,
        brick_rates: brickRates,
        updated_date: dbUtils.dateString(),
        updated_timestamp: dbUtils.timestamp()
      };

      const result = await dbUtils.writeData(`${DB_PATHS.CUSTOMERS}/${customerId}`, updateData);
      
      if (result.success) {
        return {
          success: true,
          message: 'Location deleted successfully'
        };
      }

      return result;
    } catch (error) {
      console.error('Error deleting customer location:', error);
      return { success: false, error: error.message };
    }
  },

  // Get all customers
  getAllCustomers: async () => {
    try {
      const result = await dbUtils.readData(DB_PATHS.CUSTOMERS);

      if (result.success && result.data) {
        const customersArray = Object.entries(result.data).map(([id, customer]) => ({
          ...customer,
          id
        }));

        return { success: true, data: customersArray };
      }

      return { success: true, data: [] };
    } catch (error) {
      console.error('Error getting customers:', error);
      return { success: false, error: error.message };
    }
  },

  // Get customer by ID/phone
  getCustomerById: async (customerId) => {
    try {
      const result = await dbUtils.readData(`${DB_PATHS.CUSTOMERS}/${customerId}`);
      
      if (result.success && result.data) {
        return {
          success: true,
          data: { ...result.data, id: customerId }
        };
      }

      return result;
    } catch (error) {
      console.error('Error getting customer:', error);
      return { success: false, error: error.message };
    }
  },

  // Search customers by name or phone
  searchCustomers: async (searchTerm) => {
    try {
      const allCustomersResult = await customerService.getAllCustomers();
      
      if (!allCustomersResult.success) {
        return allCustomersResult;
      }

      const customers = allCustomersResult.data || [];
      const filteredCustomers = customers.filter(customer => 
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.includes(searchTerm) ||
        (customer.business_name && customer.business_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );

      return {
        success: true,
        data: filteredCustomers
      };
    } catch (error) {
      console.error('Error searching customers:', error);
      return { success: false, error: error.message };
    }
  },

  // Delete customer
  deleteCustomer: async (customerId) => {
    try {
      const result = await dbUtils.deleteData(`${DB_PATHS.CUSTOMERS}/${customerId}`);
      return result;
    } catch (error) {
      console.error('Error deleting customer:', error);
      return { success: false, error: error.message };
    }
  },

  // Get customer's brick rate for specific location
  getCustomerBrickRate: (customer, locationId) => {
    if (!customer || !customer.brick_rates) return null;
    return customer.brick_rates[locationId] || null;
  },

  // Get customer's primary location
  getPrimaryLocation: (customer) => {
    if (!customer || !customer.locations || customer.locations.length === 0) {
      return null;
    }
    
    const primaryLoc = customer.locations.find(loc => loc.is_primary);
    return primaryLoc || customer.locations[0];
  }
};