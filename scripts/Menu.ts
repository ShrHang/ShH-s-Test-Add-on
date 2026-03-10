import { world, Player, DimensionLocation, GameMode, system } from "@minecraft/server";
import { ActionFormData, ActionFormResponse } from "@minecraft/server-ui";
import { TeleportPoint, points } from "./tpPoints";

abstract class BaseMenu {
  protected form: ActionFormData;
  protected location: DimensionLocation;

  constructor(location: DimensionLocation) {
    this.location = location;
    this.form = new ActionFormData();
  }

  public setTitle(title: string) {
    this.form.title(title);
  }

  public setBody(body: string) {
    this.form.body(body);
  }

  public addButton(text: string) {
    this.form.button(text);
  }

  public show(player: Player) {
    return this.form.show(player);
  }
}

export default class MainMenu extends BaseMenu {
  constructor(location: DimensionLocation) {
    super(location);
    this.setTitle("主菜单");
    this.setBody("欢迎使用ShH的菜单系统！");
    this.addButton("传送点");
    this.addButton("游戏模式");
  }

  public async show(player: Player): Promise<ActionFormResponse> {
    const result = await super.show(player);
    if (result.canceled) {
      player.dimension.runCommand(`title "${player.name}" actionbar 你退出了菜单。`);
      return result;
    }
    switch (result.selection) {
      case 0:
        TPMenu.create(this.location, points).then((menu) => menu.show(player));
        break;
      case 1:
        new ChangeModeMenu(this.location).show(player);
        break;
    }
    return result;
  }
}

export class TPMenu extends BaseMenu {
  private points: TeleportPoint[] = [];
  constructor(location: DimensionLocation, points: TeleportPoint[]) {
    super(location);
    this.points = points;
    this.setTitle("传送菜单");
    this.setBody("请选择一个传送地点：");
    this.addButton("返回主菜单");
  }

  public setPoints(points: TeleportPoint[]) {
    this.points = points;
    for (const p of points) {
      this.addButton(p.name);
    }
  }

  public static async create(location: DimensionLocation, points: TeleportPoint[]): Promise<TPMenu> {
    const menu = new TPMenu(location, points);
    try {
      if (Array.isArray(points)) menu.setPoints(points);
    } catch (e) {
      console.error("读取传送点失败:", e);
    }
    return menu;
  }

  public async show(player: Player): Promise<ActionFormResponse> {
    const result = await super.show(player);
    if (result.canceled) {
      player.dimension.runCommand(`title "${player.name}" actionbar 你退出了菜单。`);
      return result;
    }
    const sel = result.selection;
    if (typeof sel !== "number" || sel >= this.points.length + 1) {
      player.dimension.runCommand(`title "${player.name}" actionbar 未选择有效的传送点。`);
      return result;
    }
    if (sel === 0) {
      new MainMenu(this.location).show(player);
      return result;
    }
    const point = this.points[sel - 1];
    if (point) {
      const dimension = world.getDimension(point.dimension);
      if (!dimension) {
        player.dimension.runCommand(`title "${player.name}" actionbar 无法找到维度 ${point.dimension}。`);
        return result;
      }
      dimension.runCommand(`tp "${player.name}" ${point.x} ${point.y} ${point.z}`);
      player.dimension.runCommand(`title "${player.name}" actionbar 已传送到 ${point.name}。`);
    } else {
      player.dimension.runCommand(`title "${player.name}" actionbar 无效的传送点。`);
    }
    return result;
  }
}

export class ChangeModeMenu extends BaseMenu {
  constructor(location: DimensionLocation) {
    super(location);
    this.setTitle("游戏模式菜单");
    this.setBody("请选择一个游戏模式：");
    this.addButton("返回主菜单");
    this.addButton("生存模式");
    this.addButton("创造模式");
    this.addButton("冒险模式");
    this.addButton("旁观者模式");
  }

  public async show(player: Player): Promise<ActionFormResponse> {
    const result = await super.show(player);
    if (result.canceled) {
      player.dimension.runCommand(`title "${player.name}" actionbar 你退出了菜单。`);
      return result;
    }
    switch (result.selection) {
      case 0:
        new MainMenu(this.location).show(player);
        break;
      case 1:
        player.setGameMode(GameMode.Survival);
        player.dimension.runCommand(`title "${player.name}" actionbar 已切换到生存模式。`);
        break;
      case 2:
        player.setGameMode(GameMode.Creative);
        player.dimension.runCommand(`title "${player.name}" actionbar 已切换到创造模式。`);
        break;
      case 3:
        player.setGameMode(GameMode.Adventure);
        player.dimension.runCommand(`title "${player.name}" actionbar 已切换到冒险模式。`);
        break;
      case 4:
        player.setGameMode(GameMode.Spectator);
        player.dimension.runCommand(`title "${player.name}" actionbar 已切换到旁观者模式。`);
        break;
    }
    return result;
  }
}

export class FeatureMenu extends BaseMenu {
  constructor(location: DimensionLocation) {
    super(location);
    // TODO: 添加一些实用功能
    /**
     * 比如夜视？
     */
  }
}
