import {
  system,
  StartupEvent,
  CustomCommand,
  CommandPermissionLevel,
  CustomCommandParamType,
  CustomCommandOrigin,
  CustomCommandStatus,
  Entity,
  Player,
  Vector3,
  world,
} from "@minecraft/server";
import MainMenu from "./Menu";
import { Claim, ClaimManager } from "./claims";
import { v4 as uuid } from "uuid";
import { AABBUtils } from "@minecraft/math";

export abstract class BaseCommand {
  abstract readonly cmd: CustomCommand;

  abstract register(init: StartupEvent): void;

  protected static getPlayer(origin: CustomCommandOrigin): Player | null {
    const source = origin.sourceEntity;
    return source instanceof Player ? source : null;
  }

  protected success(message?: string) {
    return message ? { status: CustomCommandStatus.Success, message } : { status: CustomCommandStatus.Success };
  }

  protected failure(message: string) {
    return { status: CustomCommandStatus.Failure, message };
  }
}

export class MenuCommand extends BaseCommand {
  readonly cmd: CustomCommand = {
    name: "shh:menu",
    description: "打开菜单",
    permissionLevel: CommandPermissionLevel.Any,
  };

  public register(init: StartupEvent): void {
    init.customCommandRegistry.registerCommand(this.cmd, (origin: CustomCommandOrigin) => {
      const player = BaseCommand.getPlayer(origin);
      if (!player) {
        return this.failure("只有玩家可以执行此命令。");
      }
      system.run(() =>
        new MainMenu({
          dimension: player.dimension,
          x: player.location.x,
          y: player.location.y,
          z: player.location.z,
        }).show(player)
      );
      return this.success();
    });
  }
}

export class OpenMenuCommand extends BaseCommand {
  readonly cmd: CustomCommand = {
    name: "shh:openmenu",
    description: "为指定玩家打开菜单",
    permissionLevel: CommandPermissionLevel.GameDirectors,
    mandatoryParameters: [{ type: CustomCommandParamType.PlayerSelector, name: "targetPlayer" }],
  };

  public register(init: StartupEvent): void {
    init.customCommandRegistry.registerCommand(this.cmd, (origin: CustomCommandOrigin, targetPlayer) => {
      if (!targetPlayer || !Array.isArray(targetPlayer) || targetPlayer.length === 0) {
        return this.failure("没有指定有效的玩家目标。");
      }
      system.run(() => {
        for (const p of targetPlayer) {
          if (!(p instanceof Player)) continue;
          new MainMenu({
            dimension: p.dimension,
            x: p.location.x,
            y: p.location.y,
            z: p.location.z,
          }).show(p);
        }
      });
      return this.success();
    });
  }
}

export class TpPosCommand extends BaseCommand {
  readonly cmd: CustomCommand = {
    name: "shh:tppos",
    description: "将你传送到指定坐标。",
    permissionLevel: CommandPermissionLevel.Any,
    mandatoryParameters: [{ type: CustomCommandParamType.Location, name: "destination" }],
  };

  public register(init: StartupEvent): void {
    init.customCommandRegistry.registerCommand(this.cmd, (origin: CustomCommandOrigin, destination: Vector3) => {
      const player = BaseCommand.getPlayer(origin);
      if (!player) {
        return this.failure("只有玩家可以执行此命令。");
      }
      const { x, y, z } = destination;
      system.run(() => {
        try {
          player.teleport({ x, y, z });
          player.sendMessage(`已传送到 ${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}`);
        } catch (e) {
          player.sendMessage(`传送失败: ${e}`);
        }
      });
      return this.success();
    });
  }
}

export class TpEntityCommand extends BaseCommand {
  readonly cmd: CustomCommand = {
    name: "shh:tpentity",
    description: "将你传送到指定实体。",
    permissionLevel: CommandPermissionLevel.Any,
    mandatoryParameters: [{ type: CustomCommandParamType.EntitySelector, name: "targetEntity" }],
  };

  public register(init: StartupEvent): void {
    init.customCommandRegistry.registerCommand(this.cmd, (origin: CustomCommandOrigin, targetEntity: Entity) => {
      const player = origin.sourceEntity;
      if (!player || !(player instanceof Player)) {
        return this.failure("只有玩家可以执行此命令。");
      }
      if (!targetEntity || !Array.isArray(targetEntity) || targetEntity.length === 0) {
        return this.failure("没有指定有效的实体目标。");
      } else if (targetEntity.length > 1) {
        return this.failure("指定了多个实体目标，请只选择一个。");
      }
      const target = targetEntity[0] as Entity;
      system.run(() => {
        try {
          target.dimension.runCommand(
            `tp "${player.name}" ${target.location.x} ${target.location.y} ${target.location.z}`
          );
          player.sendMessage(
            `已传送到 ${target.location.x.toFixed(2)}, ${target.location.y.toFixed(2)}, ${target.location.z.toFixed(2)}`
          );
        } catch (e) {
          player.sendMessage(`传送失败: ${e}`);
        }
      });
      return this.success();
    });
  }
}

/**
 * @author LazyLeo
 * @link https://github.com/Lazy-Leo
 */
export class ClaimSetCommand extends BaseCommand {
  readonly cmd: CustomCommand = {
    name: "shh:claim",
    description: "创建领地（站在起点输入一次，站在终点再输入一次）",
    permissionLevel: CommandPermissionLevel.Any,
  };

  public register(init: StartupEvent): void {
    init.customCommandRegistry.registerCommand(this.cmd, (origin: CustomCommandOrigin) => {
      const player = origin.sourceEntity;
      if (!(player instanceof Player)) return this.failure("只有玩家可以执行此命令。");

      const pos1 = player.getDynamicProperty("shh:pos1");
      if (!pos1) {
        const { x, y, z } = player.location;
        player.setDynamicProperty("shh:pos1", JSON.stringify({ x, y, z, dim: player.dimension.id }));
        player.sendMessage("请走到对角点，再次输入 /shh:claim 完成圈地");
        return this.success("请走到对角点，再次输入 /shh:claim 完成圈地");
      } else {
        const pos2Data = { x: player.location.x, y: player.location.y, z: player.location.z, dim: player.dimension.id };
        const pos1Data = JSON.parse(pos1 as string);
        player.setDynamicProperty("shh:pos1", undefined);

        if (pos1Data.dim !== pos2Data.dim) {
          return this.failure("两个点必须在同一维度");
        }

        const minX = Math.min(pos1Data.x, pos2Data.x);
        const maxX = Math.max(pos1Data.x, pos2Data.x);
        const minY = Math.min(pos1Data.y, pos2Data.y);
        const maxY = Math.max(pos1Data.y, pos2Data.y);
        const minZ = Math.min(pos1Data.z, pos2Data.z);
        const maxZ = Math.max(pos1Data.z, pos2Data.z);

        // const aabb = AABBUtils.createFromCornerPoints()

        const area = (maxX - minX + 1) * (maxY - minY + 1) * (maxZ - minZ + 1);
        if (area > 5000) {
          return this.failure("领地过大，最大5000方块");
        }

        const manager = ClaimManager.getInstance();
        const overlapping = manager.getClaimAt(pos1Data.dim, (minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
        if (overlapping) {
          return this.failure("该区域与其他领地重叠");
        }

        const claim: Claim = {
          id: uuid(),
          name: `领地${manager.getPlayerClaims((player.getDynamicProperty("xuid") as string) || player.id).length + 1}`,
          ownerId: (player.getDynamicProperty("xuid") as string) || player.id,
          dimension: pos1Data.dim,
          minX,
          maxX,
          minY,
          maxY,
          minZ,
          maxZ,
          trustedPlayers: [],
          createdAt: Date.now(),
        };
        manager.setClaim(claim);
        player.sendMessage(`领地创建成功！ID: ${claim.id}`);
        return this.success(`领地创建成功！ID: ${claim.id}`);
      }
    });
  }
}

/**
 * @author LazyLeo
 * @link https://github.com/Lazy-Leo
 */
export class ClaimRemoveCommand extends BaseCommand {
  readonly cmd: CustomCommand = {
    name: "shh:unclaim",
    description: "删除所在位置的领地（仅所有者）",
    permissionLevel: CommandPermissionLevel.Any,
  };

  public register(init: StartupEvent): void {
    init.customCommandRegistry.registerCommand(this.cmd, (origin: CustomCommandOrigin) => {
      const player = origin.sourceEntity;
      if (!(player instanceof Player)) return this.failure("只有玩家可用");

      const manager = ClaimManager.getInstance();
      const claim = manager.getClaimAt(player.dimension.id, player.location.x, player.location.y, player.location.z);
      if (!claim) return this.failure("你不在任何领地中");

      const playerXuid = (player.getDynamicProperty("xuid") as string) || player.id;
      if (claim.ownerId !== playerXuid) {
        return this.failure("只有领地所有者可以删除");
      }

      manager.deleteClaim(claim.id);
      player.sendMessage(`领地 "${claim.name}" 已删除`);
      return this.success();
    });
  }
}

/**
 * @author LazyLeo
 * @link https://github.com/Lazy-Leo
 */
export class ClaimTrustCommand extends BaseCommand {
  readonly cmd: CustomCommand = {
    name: "shh:trust",
    description: "信任玩家到当前领地",
    permissionLevel: CommandPermissionLevel.Any,
    mandatoryParameters: [{ type: CustomCommandParamType.PlayerSelector, name: "target" }],
  };

  public register(init: StartupEvent): void {
    init.customCommandRegistry.registerCommand(this.cmd, (origin: CustomCommandOrigin, targetSelector: Player[]) => {
      const player = origin.sourceEntity;
      if (!(player instanceof Player)) return this.failure("只有玩家可用");

      const targetPlayers = targetSelector;
      if (!targetPlayers || targetPlayers.length === 0) return this.failure("未指定玩家");

      const manager = ClaimManager.getInstance();
      const claim = manager.getClaimAt(player.dimension.id, player.location.x, player.location.y, player.location.z);
      if (!claim) return this.failure("你不在任何领地中");
      if (claim.ownerId !== ((player.getDynamicProperty("xuid") as string) || player.id)) {
        return this.failure("只有领地所有者可以信任他人");
      }

      targetPlayers.forEach((p) => {
        const targetXuid = (p.getDynamicProperty("xuid") as string) || p.id;
        if (!claim.trustedPlayers.includes(targetXuid)) {
          claim.trustedPlayers.push(targetXuid);
        }
      });
      manager.setClaim(claim);
      player.sendMessage(`已信任 ${targetPlayers.map((p) => p.name).join(", ")}`);
      return this.success();
    });
  }
}

/**
 * @author LazyLeo
 * @link https://github.com/Lazy-Leo
 */
export class ClaimUntrustCommand extends BaseCommand {
  readonly cmd: CustomCommand = {
    name: "shh:untrust",
    description: "取消信任玩家",
    permissionLevel: CommandPermissionLevel.Any,
    mandatoryParameters: [{ type: CustomCommandParamType.PlayerSelector, name: "target" }],
  };

  public register(init: StartupEvent): void {
    init.customCommandRegistry.registerCommand(this.cmd, (origin: CustomCommandOrigin, targetSelector: Player[]) => {
      const player = origin.sourceEntity;
      if (!(player instanceof Player)) return this.failure("只有玩家可用");

      const targetPlayers = targetSelector;
      if (!targetPlayers || targetPlayers.length === 0) return this.failure("未指定玩家");

      const manager = ClaimManager.getInstance();
      const claim = manager.getClaimAt(player.dimension.id, player.location.x, player.location.y, player.location.z);
      if (!claim) return this.failure("你不在任何领地中");
      if (claim.ownerId !== ((player.getDynamicProperty("xuid") as string) || player.id)) {
        return this.failure("只有领地所有者可以取消信任");
      }

      targetPlayers.forEach((p) => {
        const targetXuid = (p.getDynamicProperty("xuid") as string) || p.id;
        const index = claim.trustedPlayers.indexOf(targetXuid);
        if (index !== -1) claim.trustedPlayers.splice(index, 1);
      });
      manager.setClaim(claim);
      player.sendMessage(`已取消信任 ${targetPlayers.map((p) => p.name).join(", ")}`);
      return this.success();
    });
  }
}

/**
 * @author LazyLeo
 * @link https://github.com/Lazy-Leo
 */
export class ClaimListCommand extends BaseCommand {
  readonly cmd: CustomCommand = {
    name: "shh:claims",
    description: "列出你的领地",
    permissionLevel: CommandPermissionLevel.Any,
  };

  public register(init: StartupEvent): void {
    init.customCommandRegistry.registerCommand(this.cmd, (origin: CustomCommandOrigin) => {
      const player = origin.sourceEntity;
      if (!(player instanceof Player)) return this.failure("只有玩家可用");

      const manager = ClaimManager.getInstance();
      const playerXuid = (player.getDynamicProperty("xuid") as string) || player.id;
      const claims = manager.getPlayerClaims(playerXuid);

      if (claims.length === 0) {
        player.sendMessage("你还没有任何领地");
        return this.success();
      }

      player.sendMessage("§6=== 你的领地列表 ===");
      claims.forEach((c, i) => {
        player.sendMessage(
          `§e${i + 1}. ${c.name} §7(ID: ${c.id.slice(0, 8)}...) ` +
            `§f在 ${c.dimension}  (${c.minX},${c.minY},${c.minZ}) ~ (${c.maxX},${c.maxY},${c.maxZ})`
        );
      });
      return this.success();
    });
  }
}

/**
 * @author LazyLeo
 * @link https://github.com/Lazy-Leo
 */
export class TpClaimCommand extends BaseCommand {
  readonly cmd: CustomCommand = {
    name: "shh:tpclaim",
    description: "传送到自己的领地",
    permissionLevel: CommandPermissionLevel.Any,
    mandatoryParameters: [{ type: CustomCommandParamType.String, name: "领地名称或ID" }],
  };

  public register(init: StartupEvent): void {
    init.customCommandRegistry.registerCommand(this.cmd, (origin: CustomCommandOrigin, identifier: string) => {
      const player = origin.sourceEntity;
      if (!(player instanceof Player)) return this.failure("只有玩家可用");

      const manager = ClaimManager.getInstance();
      const playerXuid = (player.getDynamicProperty("xuid") as string) || player.id;
      const claims = manager.getPlayerClaims(playerXuid);

      const searchStr = identifier.toLowerCase();
      const targetClaim = claims.find(
        (c) => c.id.toLowerCase().includes(searchStr) || c.name.toLowerCase().includes(searchStr)
      );

      if (!targetClaim) {
        return this.failure("未找到匹配的领地");
      }

      const center = {
        x: Math.floor((targetClaim.minX + targetClaim.maxX) / 2),
        y: targetClaim.minY + 1,
        z: Math.floor((targetClaim.minZ + targetClaim.maxZ) / 2),
      };

      try {
        const dimension = world.getDimension(targetClaim.dimension);
        player.teleport(center, { dimension });
        player.sendMessage(`已传送到领地 "${targetClaim.name}"`);
        return this.success();
      } catch (e) {
        return this.failure(`传送失败: ${e}`);
      }
    });
  }
}
