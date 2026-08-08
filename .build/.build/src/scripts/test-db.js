"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const ProductService = __importStar(require("../modules/product/product.service"));
const InventoryService = __importStar(require("../modules/product/inventory.service"));
async function test() {
    console.log('--- Testing Product Listing ---');
    try {
        const products = await ProductService.listProducts();
        console.log('All Products Count:', products.total);
        console.log('First Product:', JSON.stringify(products.items[0], null, 2));
        const apparel = await ProductService.listProducts({ category: 'Apparel' });
        console.log('Apparel Category Count:', apparel.total);
    }
    catch (e) {
        console.error('Error listing products:', e);
    }
    console.log('\n--- Testing Inventory Report ---');
    try {
        const report = await InventoryService.getInventoryReport();
        console.log('Report Summary:', report.summary);
        console.log('Report Records Count:', report.records.length);
    }
    catch (e) {
        console.error('Error getting inventory report:', e);
    }
    console.log('\n--- Testing Product Creation ---');
    try {
        const newProduct = await ProductService.createProduct({
            name: 'Test Product ' + Date.now(),
            category: 'Test',
            sku: 'TEST-SKU-' + Date.now(),
            price: 100
        });
        console.log('Created Product ID:', newProduct.productId);
    }
    catch (e) {
        console.error('Error creating product:', e);
    }
}
test().catch(console.error);
