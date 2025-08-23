import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
  integer,
  serial,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  passwordHash: varchar("password_hash"), // For future use - not used with Replit Auth
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Ideas table - stores canvas ideas with positioning
export const ideas = pgTable("ideas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 100 }).notNull(),
  description: text("description"),
  color: varchar("color").notNull().default('#3B82F6'),
  canvasX: integer("canvas_x").notNull().default(0),
  canvasY: integer("canvas_y").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Categories table - for organizing ideas and todos
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 50 }).notNull(),
  color: varchar("color").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// TodoLists table - containers for tasks
export const todoLists = pgTable("todolists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  categoryId: varchar("category_id").references(() => categories.id, { onDelete: 'set null' }),
  name: varchar("name", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tasks table - individual tasks that can link back to ideas
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  todoListId: varchar("todolist_id").notNull().references(() => todoLists.id, { onDelete: 'cascade' }),
  ideaId: varchar("idea_id").references(() => ideas.id, { onDelete: 'set null' }),
  title: varchar("title").notNull(),
  completed: boolean("completed").default(false),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Legacy projects table - keeping for existing functionality
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  canvasData: jsonb("canvas_data").default('{}'),
  status: varchar("status").notNull().default('active'), // active, completed, archived
  progress: integer("progress").default(0), // 0-100
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  ideas: many(ideas),
  categories: many(categories),
  todoLists: many(todoLists),
}));

export const ideasRelations = relations(ideas, ({ one, many }) => ({
  user: one(users, {
    fields: [ideas.userId],
    references: [users.id],
  }),
  tasks: many(tasks),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
  todoLists: many(todoLists),
}));

export const todoListsRelations = relations(todoLists, ({ one, many }) => ({
  user: one(users, {
    fields: [todoLists.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [todoLists.categoryId],
    references: [categories.id],
  }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  todoList: one(todoLists, {
    fields: [tasks.todoListId],
    references: [todoLists.id],
  }),
  idea: one(ideas, {
    fields: [tasks.ideaId],
    references: [ideas.id],
  }),
}));

// Legacy project relations
export const projectsRelations = relations(projects, ({ one }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  passwordHash: true,
});

export const insertIdeaSchema = createInsertSchema(ideas).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

export const insertTodoListSchema = createInsertSchema(todoLists).omit({
  id: true,
  createdAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertIdea = z.infer<typeof insertIdeaSchema>;
export type Idea = typeof ideas.$inferSelect;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export type InsertTodoList = z.infer<typeof insertTodoListSchema>;
export type TodoList = typeof todoLists.$inferSelect;

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
