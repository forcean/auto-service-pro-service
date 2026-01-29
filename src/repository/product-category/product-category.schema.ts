import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

export class Media {
  @Prop({ type: String })
  fileId: string;

  @Prop({ type: String })
  url: string;
}

@Schema({ collection: 'productCategories' })
export class ProductCategoriesEntity {
  @Prop({ type: String })
  name: string;

  @Prop({ type: String, unique: true })
  code: string;

  @Prop({ type: String })
  slug: string;

  @Prop({ type: String })
  country: string;

  @Prop({ type: String })
  description: string;

  @Prop({ type: Media, _id: false, default: {} })
  logo?: Media;

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