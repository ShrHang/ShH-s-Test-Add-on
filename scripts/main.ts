import {
  system,
  StartupEvent,
  CustomCommandStatus,
  CustomCommand,
  CommandPermissionLevel,
  CustomCommandParamType,
  Player,
  world,
  PlayerSpawnAfterEvent,
  CustomCommandOrigin,
} from "@minecraft/server";

import { MenuCommand, OpenMenuCommand, TpPosCommand, TpEntityCommand } from "./Command";
import { CommandRegistrar } from "./Registrar";
import { Claim, ClaimManager } from "./claims";
import { v4 as uuid } from "uuid"; // 需要安装 @types/uuid 和 uuid 包
import { registerClaimListeners } from "./eventListener";

system.beforeEvents.startup.subscribe((init: StartupEvent) => {
  // 注册基础命令
  new CommandRegistrar()
    .addCommand(MenuCommand)
    .addCommand(OpenMenuCommand)
    .addCommand(TpPosCommand)
    .addCommand(TpEntityCommand)
    .registerAll(init);

  // --- 领地命令注册 ---
  // 创建领地命令
  const claimCommand: CustomCommand = {
    name: "shh:claim",
    description: "创建领地（站在起点输入一次，站在终点再输入一次）",
    permissionLevel: CommandPermissionLevel.Any,
  };
  init.customCommandRegistry.registerCommand(claimCommand, (origin: CustomCommandOrigin) => {
    const player = origin.sourceEntity;
    if (!(player instanceof Player)) return { status: CustomCommandStatus.Failure, message: "只有玩家可用" };

    const pos1 = player.getDynamicProperty("shh:pos1");
    if (!pos1) {
      const { x, y, z } = player.location;
      player.setDynamicProperty("shh:pos1", JSON.stringify({ x, y, z, dim: player.dimension.id }));
      player.sendMessage("请走到对角点，再次输入 /shh:claim 完成圈地");
      return { status: CustomCommandStatus.Success };
    } else {
      const pos2Data = { x: player.location.x, y: player.location.y, z: player.location.z, dim: player.dimension.id };
      const pos1Data = JSON.parse(pos1 as string);
      player.setDynamicProperty("shh:pos1", undefined);

      if (pos1Data.dim !== pos2Data.dim) {
        return { status: CustomCommandStatus.Failure, message: "两个点必须在同一维度" };
      }

      const minX = Math.min(pos1Data.x, pos2Data.x);
      const maxX = Math.max(pos1Data.x, pos2Data.x);
      const minY = Math.min(pos1Data.y, pos2Data.y);
      const maxY = Math.max(pos1Data.y, pos2Data.y);
      const minZ = Math.min(pos1Data.z, pos2Data.z);
      const maxZ = Math.max(pos1Data.z, pos2Data.z);

      const area = (maxX - minX + 1) * (maxY - minY + 1) * (maxZ - minZ + 1);
      if (area > 5000) {
        return { status: CustomCommandStatus.Failure, message: "领地过大，最大5000方块" };
      }

      const manager = ClaimManager.getInstance();
      const overlapping = manager.getClaimAt(pos1Data.dim, (minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
      if (overlapping) {
        return { status: CustomCommandStatus.Failure, message: "该区域与其他领地重叠" };
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
      return { status: CustomCommandStatus.Success };
    }
  });

  // 删除领地命令
  const unclaimCommand: CustomCommand = {
    name: "shh:unclaim",
    description: "删除所在位置的领地（仅所有者）",
    permissionLevel: CommandPermissionLevel.Any,
  };
  init.customCommandRegistry.registerCommand(unclaimCommand, (origin: CustomCommandOrigin) => {
    const player = origin.sourceEntity;
    if (!(player instanceof Player)) return { status: CustomCommandStatus.Failure, message: "只有玩家可用" };

    const manager = ClaimManager.getInstance();
    const claim = manager.getClaimAt(player.dimension.id, player.location.x, player.location.y, player.location.z);
    if (!claim) return { status: CustomCommandStatus.Failure, message: "你不在任何领地中" };

    const playerXuid = (player.getDynamicProperty("xuid") as string) || player.id;
    if (claim.ownerId !== playerXuid) {
      return { status: CustomCommandStatus.Failure, message: "只有领地所有者可以删除" };
    }

    manager.deleteClaim(claim.id);
    player.sendMessage(`领地 "${claim.name}" 已删除`);
    return { status: CustomCommandStatus.Success };
  });

  // 信任玩家
  const trustCommand: CustomCommand = {
    name: "shh:trust",
    description: "信任玩家到当前领地",
    permissionLevel: CommandPermissionLevel.Any,
    mandatoryParameters: [{ type: CustomCommandParamType.PlayerSelector, name: "target" }],
  };
  init.customCommandRegistry.registerCommand(trustCommand, (origin: CustomCommandOrigin, targetSelector: Player[]) => {
    const player = origin.sourceEntity;
    if (!(player instanceof Player)) return { status: CustomCommandStatus.Failure };
    const targetPlayers = targetSelector;
    if (!targetPlayers || targetPlayers.length === 0)
      return { status: CustomCommandStatus.Failure, message: "未指定玩家" };

    const manager = ClaimManager.getInstance();
    const claim = manager.getClaimAt(player.dimension.id, player.location.x, player.location.y, player.location.z);
    if (!claim) return { status: CustomCommandStatus.Failure, message: "你不在任何领地中" };
    if (claim.ownerId !== ((player.getDynamicProperty("xuid") as string) || player.id)) {
      return { status: CustomCommandStatus.Failure, message: "只有领地所有者可以信任他人" };
    }

    targetPlayers.forEach((p) => {
      const targetXuid = (p.getDynamicProperty("xuid") as string) || p.id;
      if (!claim.trustedPlayers.includes(targetXuid)) {
        claim.trustedPlayers.push(targetXuid);
      }
    });
    manager.setClaim(claim);
    player.sendMessage(`已信任 ${targetPlayers.map((p) => p.name).join(", ")}`);
    return { status: CustomCommandStatus.Success };
  });

  // 取消信任
  const untrustCommand: CustomCommand = {
    name: "shh:untrust",
    description: "取消信任玩家",
    permissionLevel: CommandPermissionLevel.Any,
    mandatoryParameters: [{ type: CustomCommandParamType.PlayerSelector, name: "target" }],
  };
  init.customCommandRegistry.registerCommand(
    untrustCommand,
    (origin: CustomCommandOrigin, targetSelector: Player[]) => {
      const player = origin.sourceEntity;
      if (!(player instanceof Player)) return { status: CustomCommandStatus.Failure };
      const targetPlayers = targetSelector;
      if (!targetPlayers || targetPlayers.length === 0)
        return { status: CustomCommandStatus.Failure, message: "未指定玩家" };

      const manager = ClaimManager.getInstance();
      const claim = manager.getClaimAt(player.dimension.id, player.location.x, player.location.y, player.location.z);
      if (!claim) return { status: CustomCommandStatus.Failure, message: "你不在任何领地中" };
      if (claim.ownerId !== ((player.getDynamicProperty("xuid") as string) || player.id)) {
        return { status: CustomCommandStatus.Failure, message: "只有领地所有者可以取消信任" };
      }

      targetPlayers.forEach((p) => {
        const targetXuid = (p.getDynamicProperty("xuid") as string) || p.id;
        const index = claim.trustedPlayers.indexOf(targetXuid);
        if (index !== -1) claim.trustedPlayers.splice(index, 1);
      });
      manager.setClaim(claim);
      player.sendMessage(`已取消信任 ${targetPlayers.map((p) => p.name).join(", ")}`);
      return { status: CustomCommandStatus.Success };
    }
  );

  // 列出领地
  const claimListCommand: CustomCommand = {
    name: "shh:claims",
    description: "列出你的领地",
    permissionLevel: CommandPermissionLevel.Any,
  };
  init.customCommandRegistry.registerCommand(claimListCommand, (origin: CustomCommandOrigin) => {
    const player = origin.sourceEntity;
    if (!(player instanceof Player)) return { status: CustomCommandStatus.Failure, message: "只有玩家可用" };

    const manager = ClaimManager.getInstance();
    const playerXuid = (player.getDynamicProperty("xuid") as string) || player.id;
    const claims = manager.getPlayerClaims(playerXuid);

    if (claims.length === 0) {
      player.sendMessage("你还没有任何领地");
      return { status: CustomCommandStatus.Success };
    }

    player.sendMessage("§6=== 你的领地列表 ===");
    claims.forEach((c, i) => {
      player.sendMessage(
        `§e${i + 1}. ${c.name} §7(ID: ${c.id.slice(0, 8)}...) ` +
          `§f在 ${c.dimension}  (${c.minX},${c.minY},${c.minZ}) ~ (${c.maxX},${c.maxY},${c.maxZ})`
      );
    });
    return { status: CustomCommandStatus.Success };
  });

  // 传送到领地
  const tpClaimCommand: CustomCommand = {
    name: "shh:tpclaim",
    description: "传送到自己的领地",
    permissionLevel: CommandPermissionLevel.Any,
    mandatoryParameters: [{ type: CustomCommandParamType.String, name: "领地名称或ID" }],
  };
  init.customCommandRegistry.registerCommand(tpClaimCommand, (origin: CustomCommandOrigin, identifier: string) => {
    const player = origin.sourceEntity;
    if (!(player instanceof Player)) return { status: CustomCommandStatus.Failure, message: "只有玩家可用" };

    const manager = ClaimManager.getInstance();
    const playerXuid = (player.getDynamicProperty("xuid") as string) || player.id;
    const claims = manager.getPlayerClaims(playerXuid);

    const searchStr = identifier.toLowerCase();
    const targetClaim = claims.find(
      (c) => c.id.toLowerCase().includes(searchStr) || c.name.toLowerCase().includes(searchStr)
    );

    if (!targetClaim) {
      return { status: CustomCommandStatus.Failure, message: "未找到匹配的领地" };
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
      return { status: CustomCommandStatus.Success };
    } catch (e) {
      return { status: CustomCommandStatus.Failure, message: `传送失败: ${e}` };
    }
  });
});

// 注册事件监听器
registerClaimListeners();

// 初始化玩家 XUID
world.afterEvents.playerSpawn.subscribe((event: PlayerSpawnAfterEvent) => {
  if (!event.initialSpawn) return;
  const player = event.player;
  if (!player.getDynamicProperty("xuid")) {
    player.setDynamicProperty("xuid", player.id);
  }
});
