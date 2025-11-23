import mongoose from "mongoose";

const BlogSchema = new mongoose.Schema({
  slug: String,
  title: String,
  content: String,
  viewedBy: String,
});

export const BlogModel = mongoose.model("Blog", BlogSchema);
