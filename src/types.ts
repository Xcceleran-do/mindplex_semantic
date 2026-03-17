import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./db/schema";

// Access role used by guard middleware
export const ACCESS = {
    Collaborator: "collaborator",
    Editor: 'editor',
    Admin: 'admin',
} as const

export type Access = typeof ACCESS[keyof typeof ACCESS]

// Extracting Information from JWT
export type AuthUser = {
    sub?: string
    email?: string
    role: Access
    raw: Record<string, unknown>
}

export type AppContext = {
    Variables: {
        db: NodePgDatabase<typeof schema>
        schema: typeof schema
        authUser?: AuthUser  //from JWT
        authToken?: string   //raw bearer token
    };
};

export interface ParsedNode {
    tag: string
    text: string
    classes?: string[]
}

export interface ContentChunk {
    title: string
    author: string
    date: string
    category: string
    index: number
    content: string
}

export interface PostData {
    id: number,
    post_date: string,
    post_content: string
    brief_overview: string,
    tag: {
        name: string,
    } | [] | undefined,
    category: {
        name: string,
    } | [] | undefined,
    post_title: string,
    post_name: string,
    other_authors: [],
    co_authors: [],
    post_editors: [],
    author_name: string,
}

export interface UserData {
    id: number,
    firstName: string,
    lastName: string,
    username: string,
    email: string,
    searchName?: string,
}
