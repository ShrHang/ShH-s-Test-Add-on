// claims.ts
import { Player, world } from "@minecraft/server";

export interface Claim {
  id: string; // 唯一标识（可用 UUID）
  name: string; // 领地名称
  ownerId: string; // 所有者 XUID
  dimension: string; // 维度
  minX: number;
  minY: number;
  minZ: number; // 最小角坐标
  maxX: number;
  maxY: number;
  maxZ: number; // 最大角坐标
  trustedPlayers: string[]; // 受信任玩家 XUID 列表
  createdAt: number; // 创建时间戳
}

// 领地管理类（单例模式）
export class ClaimManager {
  private static instance: ClaimManager;
  private claims: Map<string, Claim> = new Map();
  private storageKey = "shh:claims";

  private constructor() {
    this.load();
  }

  static getInstance(): ClaimManager {
    if (!ClaimManager.instance) {
      ClaimManager.instance = new ClaimManager();
    }
    return ClaimManager.instance;
  }

  // 从世界动态属性加载数据
  private load() {
    const data = world.getDynamicProperty(this.storageKey);
    if (typeof data === "string") {
      try {
        const arr = JSON.parse(data) as Claim[];
        this.claims.clear();
        arr.forEach((c) => this.claims.set(c.id, c));
      } catch (e) {
        console.warn("加载领地数据失败:", e);
      }
    }
  }

  // 保存到世界动态属性
  private save() {
    const arr = Array.from(this.claims.values());
    world.setDynamicProperty(this.storageKey, JSON.stringify(arr));
  }

  // 获取所有领地
  getAllClaims(): Claim[] {
    return Array.from(this.claims.values());
  }

  // 通过 ID 获取领地
  getClaim(id: string): Claim | undefined {
    return this.claims.get(id);
  }

  // 获取玩家拥有的领地
  getPlayerClaims(xuid: string): Claim[] {
    return this.getAllClaims().filter((c) => c.ownerId === xuid);
  }

  // 获取坐标所在的领地（可能有重叠，按需返回第一个或合并处理）
  getClaimAt(dimension: string, x: number, y: number, z: number): Claim | undefined {
    return this.getAllClaims().find(
      (c) =>
        c.dimension === dimension &&
        x >= c.minX &&
        x <= c.maxX &&
        y >= c.minY &&
        y <= c.maxY &&
        z >= c.minZ &&
        z <= c.maxZ
    );
  }

  // 添加或更新领地
  setClaim(claim: Claim): void {
    this.claims.set(claim.id, claim);
    this.save();
  }

  // 删除领地
  deleteClaim(id: string): boolean {
    const existed = this.claims.delete(id);
    if (existed) this.save();
    return existed;
  }

  // 检查玩家是否有权限操作指定位置的方块
  hasPermission(player: Player, dimension: string, x: number, y: number, z: number): boolean {
    const claim = this.getClaimAt(dimension, x, y, z);
    if (!claim) return true; // 无领地则允许
    const xuid = (player.getDynamicProperty("xuid") as string) || player.id; // 假设已存储 XUID
    return claim.ownerId === xuid || claim.trustedPlayers.includes(xuid);
  }
}
