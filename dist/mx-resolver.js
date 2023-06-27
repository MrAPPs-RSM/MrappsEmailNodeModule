"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dns_1 = __importDefault(require("dns"));
class MxResolver {
    resolve(hostname) {
        return __awaiter(this, void 0, void 0, function* () {
            const mx = yield this.resolveMxAsync(hostname);
            return yield this.lookup(mx);
        });
    }
    resolveMxAsync(hostname) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                try {
                    dns_1.default.resolveMx(hostname, (resolveErr, addresses) => {
                        return resolveErr ? reject(resolveErr) : resolve(addresses[0].exchange);
                    });
                }
                catch (err) {
                    return reject(err);
                }
            });
        });
    }
    lookup(hostname) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                try {
                    dns_1.default.lookup(hostname, (resolveErr, address) => {
                        return resolveErr ? reject(resolveErr) : resolve(address);
                    });
                }
                catch (err) {
                    return reject(err);
                }
            });
        });
    }
}
exports.default = MxResolver;
//# sourceMappingURL=mx-resolver.js.map