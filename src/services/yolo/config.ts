// All YOLO model constants live here. Change values in this one place if the
// exported ONNX model ever changes.
//
// Confirmed model spec (custom YOLOv8-style detector):
//   Input : name "images", float32, [1, 3, 640, 640] NCHW, RGB, pixel/255,
//           letterbox to 640x640 with padding value 114.
//   Output: float32, [1, 5, 8400] = [1, 4+nc, N], nc = 1.
//           channels: 0=x, 1=y, 2=w, 3=h, 4=class confidence (xywh centre, 640 space,
//           no objectness, no NMS).
//   Class : 0 = gerobak (PKL).
export const YOLO_CONFIG = {
  modelPath: '/models/best.onnx',
  inputName: 'images',
  inputWidth: 640,
  inputHeight: 640,
  confidenceThreshold: 0.5,
  nmsIoUThreshold: 0.4,
  paddingValue: 114,
  classNames: {
    0: 'gerobak',
  } as Record<number, string>,
}

export function classNameFor(classId: number): string {
  return YOLO_CONFIG.classNames[classId] ?? `class ${classId}`
}
