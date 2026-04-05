Quy định nghiêm ngặt cấu trúc dữ liệu cho thuật toán và Zustand
.
// 1. Cấu trúc Object Line (Dữ liệu gốc từ Canvas) [10]
export interface ILineSegment {
  type: 'straight' | 'zigzag';
  startY: number;
  endY: number;
}

export interface ITramline {
  id: string; // UUID
  pageNumber: number; 
  startY: number; 
  endY: number; 
  shotName: string; // Tên Shot (VD: 1A, 1B) [10]
  shotSize: string; // Kích cỡ (VD: MCU, CU, WIDE) [10]
  color: string; 
  segments: ILineSegment[]; // Chứa các đoạn phân tách nội dung quay/không quay [11]
}

// 2. Cấu trúc Shotlist Table Row (Dữ liệu chế biến & đồng bộ) [11]
export interface IShotlistRow {
  rowNumber: number; 
  sceneNumber: string; // Auto Detect từ kịch bản [11]
  location: string; 
  shotName: string; // Đồng bộ từ ITramline [11]
  intExt: 'INT' | 'EXT' | ''; 
  dayNight: 'DAY' | 'NIGHT' | ''; 
  description: string; 
  autoDetectText: string; // Text chỉ lấy từ đoạn thẳng (straight) [12, 13]
  dialogue: string[]; // Mảng thoại quét được [12]
  subjects: string[]; // Nhân vật in hoa từ text Action [12]
  scriptTime: string; 
  shotSize: string; // Đồng bộ từ ITramline [12]
  tramlineId: string; // KHÓA NGOẠI: Để binding 2 chiều với Canvas [12]
}