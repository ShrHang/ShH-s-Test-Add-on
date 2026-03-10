// ClaimMenu.ts
import { Player, DimensionLocation, system, world } from "@minecraft/server";
import { ActionFormData, ActionFormResponse, ModalFormData } from "@minecraft/server-ui";
import { BaseMenu } from "./Menu"; // 导入 BaseMenu
import { ClaimManager, Claim } from "./claims";
import { ModalFormDataTextFieldOptions } from "@minecraft/server-ui";

export class ClaimMainMenu extends BaseMenu {
  location: any;
  constructor(location: DimensionLocation) {
    super(location);
    this.setTitle("领地管理");
    this.setBody("请选择操作：");
    this.addButton("我的领地列表");
    this.addButton("创建新领地");
    this.addButton("当前领地详情");
    this.addButton("返回主菜单");
  }

  public async show(player: Player): Promise<ActionFormResponse> {
    const result = await super.show(player);
    if (result.canceled) {
      player.dimension.runCommand(`title "${player.name}" actionbar 你退出了领地菜单。`);
      return result;
    }
    switch (result.selection) {
      case 0:
        await this.showClaimList(player);
        break;
      case 1:
        await this.createClaim(player);
        break;
      case 2:
        await this.showCurrentClaim(player);
        break;
      case 3:
        // 获取默认导出
        const MainMenuModule = await import("./Menu");
        const MainMenu = MainMenuModule.default;
        new MainMenu(this.location).show(player);
        break;
    }
    return result;
  }

  private async showClaimList(player: Player) {
    const manager = ClaimManager.getInstance();
    const xuid = (player.getDynamicProperty("xuid") as string) || player.id;
    const claims = manager.getPlayerClaims(xuid);
    if (claims.length === 0) {
      player.sendMessage("你还没有任何领地");
      return;
    }

    const form = new ActionFormData();
    form.title("我的领地列表");
    form.body("选择一个领地管理");
    claims.forEach((c) => form.button(`${c.name}\n§7${c.dimension}`));
    form.button("返回");

    const response = await form.show(player);
    if (response.canceled || response.selection === claims.length) {
      this.show(player);
    } else {
      const claim = claims[response.selection!];
      await this.manageClaim(player, claim);
    }
  }

  private async manageClaim(player: Player, claim: Claim) {
    const form = new ActionFormData();
    form.title(`管理 ${claim.name}`);
    form.body(`所有者: ${claim.ownerId}\n信任人数: ${claim.trustedPlayers.length}`);
    form.button("信任玩家");
    form.button("取消信任");
    form.button("重命名");
    form.button("删除领地");
    form.button("传送至此");
    form.button("返回列表");

    const response = await form.show(player);
    if (response.canceled) return;
    switch (response.selection) {
      case 0: // 信任
        await this.trustPlayer(player, claim);
        break;
      case 1: // 取消信任
        await this.untrustPlayer(player, claim);
        break;
      case 2: // 重命名
        await this.renameClaim(player, claim);
        break;
      case 3: // 删除
        await this.deleteClaim(player, claim);
        break;
      case 4: // 传送
        player.teleport(
          {
            x: (claim.minX + claim.maxX) / 2,
            y: claim.minY + 1,
            z: (claim.minZ + claim.maxZ) / 2,
          },
          { dimension: player.dimension }
        );
        player.sendMessage(`已传送到 ${claim.name}`);
        break;
      case 5:
        this.showClaimList(player);
        break;
    }
  }

  private async trustPlayer(player: Player, claim: Claim) {
    // 获取在线玩家列表供选择（简化版，可改成输入名字）
    const players = world.getAllPlayers();
    if (players.length <= 1) {
      player.sendMessage("没有其他在线玩家");
      return;
    }
    const form = new ActionFormData();
    form.title("选择要信任的玩家");
    players.forEach((p) => {
      if (p.id !== player.id) form.button(p.name);
    });
    form.button("取消");
    const resp = await form.show(player);
    if (resp.canceled || resp.selection === players.length - 1) return;
    const target = players.find((_, i) => i === resp.selection);
    if (!target) return;

    const xuid = (target.getDynamicProperty("xuid") as string) || target.id;
    if (!claim.trustedPlayers.includes(xuid)) {
      claim.trustedPlayers.push(xuid);
      ClaimManager.getInstance().setClaim(claim);
      player.sendMessage(`已信任 ${target.name}`);
    } else {
      player.sendMessage(`${target.name} 已在信任列表中`);
    }
    this.manageClaim(player, claim);
  }

  private async untrustPlayer(player: Player, claim: Claim) {
    // 显示信任列表供选择
    if (claim.trustedPlayers.length === 0) {
      player.sendMessage("暂无信任玩家");
      return;
    }
    const form = new ActionFormData();
    form.title("选择要取消信任的玩家");
    // 这里需要将 XUID 解析为玩家名，简化处理：直接显示 XUID
    claim.trustedPlayers.forEach((xuid) => form.button(xuid));
    form.button("取消");
    const resp = await form.show(player);
    if (resp.canceled || resp.selection === claim.trustedPlayers.length) return;
    const removed = claim.trustedPlayers.splice(resp.selection!, 1);
    ClaimManager.getInstance().setClaim(claim);
    player.sendMessage(`已取消信任 ${removed[0]}`);
    this.manageClaim(player, claim);
  }

  private async renameClaim(player: Player, claim: Claim) {
    const form = new ModalFormData();
    form.title("重命名领地");

    // 正确的参数传递方式：label, placeholder, defaultValue
    (form as any).textField("新名称", "输入新名称", claim.name);

    const resp = await form.show(player);
    if (resp.canceled || !resp.formValues) return;

    const newName = resp.formValues[0] as string;
    if (newName && newName.trim() !== "") {
      claim.name = newName;
      ClaimManager.getInstance().setClaim(claim);
      player.sendMessage(`§a领地已重命名为: ${newName}`);
    }
    this.manageClaim(player, claim);
  }

  private async deleteClaim(player: Player, claim: Claim) {
    const form = new ActionFormData();
    form.title("确认删除");
    form.body(`确定要删除领地 "${claim.name}" 吗？此操作不可逆。`);
    form.button("确认删除");
    form.button("取消");
    const resp = await form.show(player);
    if (resp.canceled || resp.selection === 1) return;
    ClaimManager.getInstance().deleteClaim(claim.id);
    player.sendMessage("领地已删除");
  }

  private async createClaim(player: Player) {
    // 直接调用 /shh:claim 命令的相同逻辑，或者提示用户使用命令
    player.sendMessage("请使用 /shh:claim 命令创建领地：站在起点输入一次，站在终点再输入一次");
  }

  private async showCurrentClaim(player: Player) {
    const manager = ClaimManager.getInstance();
    const claim = manager.getClaimAt(player.dimension.id, player.location.x, player.location.y, player.location.z);
    if (!claim) {
      player.sendMessage("你当前不处于任何领地中");
      return;
    }
    const form = new ActionFormData();
    form.title(`当前领地: ${claim.name}`);
    form.body(
      `所有者: ${claim.ownerId}\n` +
        `信任玩家: ${claim.trustedPlayers.length}\n` +
        `范围: (${claim.minX},${claim.minY},${claim.minZ}) ~ (${claim.maxX},${claim.maxY},${claim.maxZ})`
    );
    if (claim.ownerId === ((player.getDynamicProperty("xuid") as string) || player.id)) {
      form.button("管理领地");
    }
    form.button("返回");
    const resp = await form.show(player);
    if (
      !resp.canceled &&
      resp.selection === 0 &&
      claim.ownerId === ((player.getDynamicProperty("xuid") as string) || player.id)
    ) {
      this.manageClaim(player, claim);
    } else {
      this.show(player);
    }
  }
}
