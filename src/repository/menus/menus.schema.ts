import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

@Schema({ collection: 'menus' })
export class MenuEntity {
  @Prop({ type: Number })
  seq: number;

  @Prop({ type: String })
  key: string;

  @Prop({ type: String })
  displayName: string;

  @Prop({ type: String })
  icon: string;

  @Prop({ type: String })
  endpoint: string;

  @Prop({ type: Boolean })
  activeFlag: boolean;

  @Prop({ type: [String] })
  children: string[];
}

export const MenuSchema = SchemaFactory.createForClass(MenuEntity);