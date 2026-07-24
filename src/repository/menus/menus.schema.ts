import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MenuDocument = HydratedDocument<MenuEntity>;
@Schema({ collection: 'menus' })
export class MenuEntity {
  @Prop({ type: Number, required: true })
  seq!: number;

  @Prop({ type: String, required: true })
  key!: string;

  @Prop({ type: String, required: true })
  displayName!: string;

  @Prop({ type: String, default: null })
  icon!: string | null;

  @Prop({ type: String, default: null })
  endpoint!: string | null;

  @Prop({ type: Boolean, default: true })
  activeFlag!: boolean;

  @Prop({
    type: Types.ObjectId,
    ref: MenuEntity.name,
    default: null,
  })
  parentId!: Types.ObjectId | null;
}

export const MenuSchema = SchemaFactory.createForClass(MenuEntity);
