"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listNotifications = exports.createNotificationRequest = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const DB_PATH = path_1.default.join(process.cwd(), 'db.json');
async function readDb() {
    const data = await promises_1.default.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
}
async function writeDb(data) {
    await promises_1.default.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}
const createNotificationRequest = async (request) => {
    const db = await readDb();
    if (!db.notifications) {
        db.notifications = [];
    }
    const newRequest = {
        ...request,
        id: Date.now().toString(),
        status: 'pending',
        createdAt: Date.now()
    };
    db.notifications.push(newRequest);
    await writeDb(db);
    return newRequest;
};
exports.createNotificationRequest = createNotificationRequest;
const listNotifications = async () => {
    const db = await readDb();
    return db.notifications || [];
};
exports.listNotifications = listNotifications;
