export interface TeleportPoint {
  name: string; // 地点名称
  dimension: string; // 维度名称，如 "overworld", "nether", "the_end"
  x: number; // X坐标
  y: number; // Y坐标
  z: number; // Z坐标
}

export const points: TeleportPoint[] = [
  // 在这里写入传送点数据
  { name: "迟家镇", dimension: "overworld", x: 429, y: 141, z: 323 },
  { name: "云杉阁", dimension: "overworld", x: 6400, y: 99, z: 3447 },
  { name: "秦山", dimension: "overworld", x: 208, y: 92, z: 194 },
  { name: "华胥", dimension: "overworld", x: 429, y: 126, z: 514 },
  { name: "年初村", dimension: "overworld", x: 2843, y: 76, z: 236 },
  { name: "苏尔达", dimension: "overworld", x: 8165, y: 80, z: 6461 },
  { name: "无主之地", dimension: "overworld", x: 9000, y: 80, z: 9000 },
  { name: "跨年岛", dimension: "overworld", x: 45, y: 46, z: 45 },
  { name: "月岚", dimension: "overworld", x: 980, y: 64, z: 600 },
];
