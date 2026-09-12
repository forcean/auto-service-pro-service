export enum EWorkOrderStatus {
  OPEN = 'OPEN', // สร้างใบงานไว้ก่อน
  INSPECTING = 'INSPECTING', // กำลังตรวจสอบ
  WAITING_QUOTATION = 'WAITING_QUOTATION', // รอสร้างใบเสนอราคา
  WAITING_APPROVAL = 'WAITING_APPROVAL', // รออนุมัติใบเสนอราคา
  WAITING_ASSIGNMENT = 'WAITING_ASSIGNMENT', // รอการมอบหมายงาน
  IN_PROGRESS = 'IN_PROGRESS', // กำลังดำเนินการซ่อม
  WAITING_QC = 'WAITING_QC', // รอการตรวจสอบคุณภาพ
  REWORK = 'REWORK', // QC ไม่ผ่าน รอแก้ไขงาน
  WAITING_ADDITIONAL_APPROVAL = 'WAITING_ADDITIONAL_APPROVAL', // รออนุมัติงานเพิ่มเติม
  QC_APPROVED = 'QC_APPROVED', // ผ่านการตรวจสอบคุณภาพ
  READY_DELIVERY = 'READY_DELIVERY', // พร้อมจัดส่ง
  COMPLETED = 'COMPLETED', // เสร็จสิ้น
  CANCELLED = 'CANCELLED', // ยกเลิก
  HOLD = 'HOLD', // หยุดชั่วคราว
}

export enum EFuelLevel {
  EMPTY = 'EMPTY',
  QUARTER = 'QUARTER',
  HALF = 'HALF',
  THREE_QUARTER = 'THREE_QUARTER',
  FULL = 'FULL',
}
