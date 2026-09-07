export enum EStockMovementType {
  RECEIVE = 'RECEIVE',
  ISSUE = 'ISSUE',
  RETURN = 'RETURN',
  ADJUST = 'ADJUST',
  RESERVE = 'RESERVE',
  RELEASE = 'RELEASE',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
}

export enum EStockStatus {
  OUT = 'out',
  LOW = 'low',
  NORMAL = 'normal',
}

export enum EStockReferenceType {
  PURCHASE_ORDER = 'PURCHASE_ORDER', // รับของจากใบสั่งซื้อ
  SALES_ORDER = 'SALES_ORDER', // ตัดของจากออเดอร์ขาย
  RETURN_ORDER = 'RETURN_ORDER', // คืนสินค้า
  STOCK_ADJUSTMENT = 'STOCK_ADJUSTMENT', // ปรับสต๊อก
  STOCK_TRANSFER = 'STOCK_TRANSFER', // ย้ายคลัง
  STOCK_COUNT = 'STOCK_COUNT', // ตรวจนับสต๊อก
  INITIAL_STOCK = 'INITIAL_STOCK', // ตั้งต้นสินค้า
  MANUAL = 'MANUAL', // แก้ไขด้วยคน
  SYSTEM = 'SYSTEM', // ระบบอัตโนมัติ
  PART_ISSUE = 'PART_ISSUE', // ระบบอัตโนมัติ
}