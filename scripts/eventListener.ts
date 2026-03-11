import {
  world,
  Player,
  system,
  PlayerBreakBlockBeforeEvent,
  PlayerInteractWithBlockBeforeEvent,
  PlayerInteractWithEntityBeforeEvent,
} from "@minecraft/server";
import { ClaimManager } from "./claims";

export function registerClaimListeners() {
  const manager = ClaimManager.getInstance();

  // 方块破坏事件
  world.beforeEvents.playerBreakBlock.subscribe((event: PlayerBreakBlockBeforeEvent) => {
    const { player, block } = event;
    const { x, y, z } = block.location;
    if (!manager.hasPermission(player, block.dimension.id, x, y, z)) {
      player.sendMessage("§c你不能破坏其他领地的方块！");
      event.cancel = true;
    }
  });

  // 方块放置事件 - 使用类型断言绕过类型检查
  (world.beforeEvents as any).playerPlaceBlock.subscribe((event: any) => {
    const { player, block } = event;
    const { x, y, z } = block.location;
    if (!manager.hasPermission(player, block.dimension.id, x, y, z)) {
      player.sendMessage("§c你不能在其他领地放置方块！");
      event.cancel = true;
    }
  });

  // 与方块交互
  world.beforeEvents.playerInteractWithBlock.subscribe((event: PlayerInteractWithBlockBeforeEvent) => {
    const { player, block } = event;
    const { x, y, z } = block.location;
    if (!manager.hasPermission(player, block.dimension.id, x, y, z)) {
      player.sendMessage("§c你没有权限使用此方块！");
      event.cancel = true;
    }
  });

  // 与实体交互
  world.beforeEvents.playerInteractWithEntity.subscribe((event: PlayerInteractWithEntityBeforeEvent) => {
    const { player, target } = event;
    if (!(target instanceof Player)) {
      const { x, y, z } = target.location;
      if (!manager.hasPermission(player, target.dimension.id, x, y, z)) {
        player.sendMessage("§c你不能在其他领地与实体交互！");
        event.cancel = true;
      }
    }
  });

  // 玩家移动进入领地提示（可选）
  world.afterEvents.playerSpawn.subscribe(() => {
    system.runInterval(() => {
      world.getAllPlayers().forEach((player) => {
        const claim = manager.getClaimAt(player.dimension.id, player.location.x, player.location.y, player.location.z);
        // 可在此添加进入领地提示逻辑
      });
    }, 20);
  });
}
