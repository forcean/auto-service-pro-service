import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

@Schema({ collection: 'productCategories' })
export class ProductCategoriesEntity {

  @Prop({ type: String })
  name: string;

  @Prop({ type: String })
  slug: string;

  @Prop({ type: String, unique: true })
  code: string;

  @Prop({ type: Number })
  level: number;

  @Prop({ type: String })
  parentId: string | null;

  @Prop({ type: String })
  path: string;

  @Prop({ type: Boolean })
  isSelectable: boolean;

  @Prop({ type: Number })
  sortOrder: number;

  @Prop({ type: Boolean })
  allowVehicleBinding: boolean;

  @Prop({ type: Boolean })
  allowStock: boolean;

  @Prop({ type: Boolean })
  isActive: boolean;

  @Prop({ type: Boolean })
  isDeleted: boolean;

  @Prop({ type: Date })
  createdDt?: Date;

  @Prop({ type: Date })
  updatedDt?: Date;
}

export const ProductCategoriesSchema = SchemaFactory.createForClass(ProductCategoriesEntity);