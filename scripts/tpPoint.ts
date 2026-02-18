export interface TeleportPoint {
  name: string; // 地点名称
  dimension: string; // 维度名称，如 "overworld", "nether", "the_end"
  x: number; // X坐标
  y: number; // Y坐标
  z: number; // Z坐标
}

export const points: TeleportPoint[] = [
  // 在这里写入传送点数据
  { name: "传送点1", dimension: "overworld", x: 100, y: 100, z: 100 },
  { name: "传送点2", dimension: "nether", x: -50, y: 70, z: -50 },
  { name: "传送点3", dimension: "the_end", x: 0, y: 50, z: 0 },
];
