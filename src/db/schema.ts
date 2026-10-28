import * as p from 'drizzle-orm/pg-core'

export const tenantBusinessModelEnum = p.pgEnum('tenant_business_model', [
  'DINE_IN_RESTO',
  'QUICK_SERVICE_CAFE',
  'CLOUD_KITCHEN',
  'RETAIL_GROCERY',
  'RETAIL_BOUTIQUE',
  'RETAIL_ELECTRONIC',
  'WHOLESALE_DISTRIBUTOR',
  'SERVICE_BEAUTY_WELLNESS',
  'SERVICE_LAUNDRY',
  'SERVICE_RENTAL'
]);

export const productTypeEnum = p.pgEnum('product_type', [
  'FOOD_BEVERAGE',  // Makanan/Minuman (butuh resep/olahan)
  'RETAIL_GOODS',   // Barang jadi (pakaian, elektronik, sembako)
  'WHOLESALE_BULK', // Barang grosir (punya tier harga)
  'SERVICE'         // Jasa/Layanan (laundry, potong rambut, sewa)
]);

export const usersTable = p.pgTable('users', {
  id: p.uuid('id').primaryKey().defaultRandom(),
  name: p.varchar({ length: 255 }).notNull(),
  age: p.integer().notNull(),
  email: p.varchar({ length: 255 }).notNull().unique(),
})

export const tenant = p.pgTable('tenants', {
  id: p.uuid('id').primaryKey().defaultRandom(),
  name: p.varchar({ length: 50 }).notNull(),
  address: p.text('address').notNull(),
  phone: p.varchar({ length: 20 }),
  email: p.varchar({ length: 100 }),
  operatingHours: p.jsonb('operating_hours'),
  businessModel: tenantBusinessModelEnum('business_model').notNull(),
  status: p.varchar({ length: 20 }).default('active').notNull(),
  createdAt: p.timestamp('created_at').defaultNow().notNull(),
  updatedAt: p.timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
})

export const product = p.pgTable('products', {
  id: p.uuid('id').primaryKey().defaultRandom(),
  tenantId: p.uuid('tenant_id').references(() => tenant.id, { onDelete: 'cascade' }).notNull(),
  name: p.varchar({ length: 150 }).notNull(),
  description: p.text('description'),
  productType: productTypeEnum('product_type').notNull(),

  // Harga dasar / harga eceran pelanggan umum
  basePrice: p.numeric('base_price', { precision: 12, scale: 2 }).notNull(),

  // SKU / Barcode (Bisa null untuk Jasa)
  sku: p.varchar({ length: 50 }),

  // Jasa tidak mengurangi stok fisik, tapi Retail/F&B (bahan mentah) butuh ini
  trackStock: p.boolean('track_stock').default(true).notNull(),
  currentStock: p.integer('current_stock').default(0).notNull(),

  // Menyimpan data spesifik sesuai productType dalam bentuk JSON
  attributes: p.jsonb('attributes').default({}).notNull(),

  isActive: p.boolean('is_active').default(true).notNull(),
  createdAt: p.timestamp('created_at').defaultNow().notNull(),
  updatedAt: p.timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
});

// TABEL VARIAN PRODUK (Retail/F&B)
export const productVariant = p.pgTable('product_variants', {
  id: p.uuid('id').primaryKey().defaultRandom(),
  productId: p.uuid('product_id').references(() => product.id, { onDelete: 'cascade' }).notNull(),
  name: p.varchar({ length: 100 }).notNull(), // Misal: "Merah / Size XL"
  sku: p.varchar({ length: 50 }),
  price: p.numeric('price', { precision: 12, scale: 2 }), // Jika null, pakai basePrice di tabel product
  stock: p.integer('stock').default(0).notNull(),
});


// TABEL MODIFIER / ADD-ONS (F&B)
export const productModifier = p.pgTable('product_modifiers', {
  id: p.uuid('id').primaryKey().defaultRandom(),
  productId: p.uuid('product_id').references(() => product.id, { onDelete: 'cascade' }).notNull(),
  name: p.varchar({ length: 100 }).notNull(), // Misal: "Ekstra Keju", "Level 5"
  extraPrice: p.numeric('extra_price', { precision: 12, scale: 2 }).default('0.00').notNull(),
});


// TABEL BAHAN BAKU (F&B / Inventory)
export const ingredient = p.pgTable('ingredients', {
  id: p.uuid('id').primaryKey().defaultRandom(),
  tenantId: p.uuid('tenant_id').references(() => tenant.id, { onDelete: 'cascade' }).notNull(),
  name: p.varchar({ length: 100 }).notNull(), // Misal: "Beras", "Sirup Vanilla"
  unit: p.varchar({ length: 20 }).notNull(), // Misal: "kg", "ml", "pcs"
  currentStock: p.numeric('current_stock', { precision: 12, scale: 4 }).default('0.0000').notNull(),
});

// TABEL RESEP / LINK PRODUK KE BAHAN BAKU
export const productRecipe = p.pgTable('product_recipes', {
  id: p.uuid('id').primaryKey().defaultRandom(),
  // Hubungkan ke variant jika resep berbeda tiap ukuran, atau ke product utama
  productId: p.uuid('product_id').references(() => product.id, { onDelete: 'cascade' }).notNull(),
  ingredientId: p.uuid('ingredient_id').references(() => ingredient.id, { onDelete: 'cascade' }).notNull(),
  quantityUsed: p.numeric('quantity_used', { precision: 12, scale: 4 }).notNull(), // Misal: 0.1500 kg
});

// 5TABEL HARGA GROSIR (Wholesale Tiers)
export const wholesalePrice = p.pgTable('wholesale_prices', {
  id: p.uuid('id').primaryKey().defaultRandom(),
  productId: p.uuid('product_id').references(() => product.id, { onDelete: 'cascade' }).notNull(),
  minQuantity: p.integer('min_quantity').notNull(), // Misal: 12 (1 lusin)
  pricePerUnit: p.numeric('price_per_unit', { precision: 12, scale: 2 }).notNull(),
}, (table) => [
  // Mencegah duplikasi aturan kuantitas pada produk yang sama
  p.unique('product_min_qty_unique').on(table.productId, table.minQuantity)
]);
