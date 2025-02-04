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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupTooltips = exports.createFloatingTooltip = void 0;
var dom_1 = require("@floating-ui/dom");
// Function to create and manage a floating tooltip
var createFloatingTooltip = function (_a) {
    var content = _a.content, target = _a.target, _b = _a.placement, placement = _b === void 0 ? "top" : _b, _c = _a.offsetValue, offsetValue = _c === void 0 ? 8 : _c, _d = _a.arrowSelector, arrowSelector = _d === void 0 ? ".dts-tooltip__arrow" : _d;
    var tooltip = document.createElement("div");
    tooltip.setAttribute("role", "tooltip");
    tooltip.className = "dts-tooltip";
    tooltip.textContent = content;
    // Optional arrow element within the tooltip
    var arrowElement = document.createElement("div");
    arrowElement.className = arrowSelector.replace(".", "");
    tooltip.appendChild(arrowElement);
    document.body.appendChild(tooltip);
    var updateTooltipPosition = function () { return __awaiter(void 0, void 0, void 0, function () {
        var result, x, y, middlewareData, _a, arrowX, arrowY, staticSide, error_1;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, dom_1.computePosition)(target, tooltip, {
                            placement: placement,
                            middleware: [
                                (0, dom_1.offset)(offsetValue),
                                (0, dom_1.flip)(),
                                (0, dom_1.shift)({ padding: 5 }),
                                (0, dom_1.arrow)({ element: arrowElement }),
                            ],
                        })];
                case 1:
                    result = _c.sent();
                    x = result.x, y = result.y, middlewareData = result.middlewareData;
                    Object.assign(tooltip.style, {
                        left: "".concat(x, "px"),
                        top: "".concat(y, "px"),
                        position: "absolute",
                        display: "block",
                    });
                    // Adjust the arrow based on computed data
                    if (middlewareData === null || middlewareData === void 0 ? void 0 : middlewareData.arrow) {
                        _a = middlewareData.arrow, arrowX = _a.x, arrowY = _a.y;
                        staticSide = {
                            top: "bottom",
                            right: "left",
                            bottom: "top",
                            left: "right",
                        }[result.placement.split("-")[0]];
                        Object.assign(arrowElement.style, (_b = {
                                left: arrowX !== null ? "".concat(arrowX, "px") : "",
                                top: arrowY !== null ? "".concat(arrowY, "px") : ""
                            },
                            _b[staticSide] = "-4px",
                            _b));
                    }
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _c.sent();
                    console.error("Failed to update tooltip position:", error_1);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); };
    var showTooltip = function () {
        tooltip.style.display = "block";
        updateTooltipPosition();
    };
    var hideTooltip = function () {
        tooltip.style.display = "none";
    };
    // Event listeners for showing and hiding the tooltip
    ["pointerenter", "focus"].forEach(function (event) {
        return target.addEventListener(event, showTooltip);
    });
    ["pointerleave", "blur"].forEach(function (event) {
        return target.addEventListener(event, hideTooltip);
    });
    // Clean up the tooltip when the target element is removed
    target.addEventListener("mouseleave", function () {
        tooltip.remove();
    });
};
exports.createFloatingTooltip = createFloatingTooltip;
// Function to set up tooltips for all buttons with a specific class
var setupTooltips = function (buttonSelector) {
    var buttons = document.querySelectorAll(buttonSelector);
    buttons.forEach(function (button) {
        var tooltipContent = button.getAttribute("data-tooltip-content");
        if (tooltipContent) {
            var tooltip_1 = button.nextElementSibling;
            var arrowElement_1 = tooltip_1 === null || tooltip_1 === void 0 ? void 0 : tooltip_1.querySelector(".dts-tooltip__arrow");
            if (!tooltip_1 || !arrowElement_1) {
                console.error("Tooltip or arrow element not found for button", button);
                return;
            }
            var updateTooltipPosition_1 = function () { return __awaiter(void 0, void 0, void 0, function () {
                var result, x, y, middlewareData, _a, arrowX, arrowY, staticSide, error_2;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _c.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, (0, dom_1.computePosition)(button, tooltip_1, {
                                    placement: "top",
                                    middleware: [
                                        (0, dom_1.offset)(6),
                                        (0, dom_1.flip)(),
                                        (0, dom_1.shift)({ padding: 5 }),
                                        (0, dom_1.arrow)({ element: arrowElement_1 }),
                                    ],
                                })];
                        case 1:
                            result = _c.sent();
                            x = result.x, y = result.y, middlewareData = result.middlewareData;
                            Object.assign(tooltip_1.style, {
                                left: "".concat(x, "px"),
                                top: "".concat(y, "px"),
                                position: "absolute",
                                display: "block",
                            });
                            // Adjust the arrow based on computed data
                            if (middlewareData === null || middlewareData === void 0 ? void 0 : middlewareData.arrow) {
                                _a = middlewareData.arrow, arrowX = _a.x, arrowY = _a.y;
                                staticSide = {
                                    top: "bottom",
                                    right: "left",
                                    bottom: "top",
                                    left: "right",
                                }[result.placement.split("-")[0]];
                                Object.assign(arrowElement_1.style, (_b = {
                                        left: arrowX !== null ? "".concat(arrowX, "px") : "",
                                        top: arrowY !== null ? "".concat(arrowY, "px") : ""
                                    },
                                    _b[staticSide] = "-4px",
                                    _b));
                            }
                            return [3 /*break*/, 3];
                        case 2:
                            error_2 = _c.sent();
                            console.error("Failed to update tooltip position:", error_2);
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); };
            var showTooltip_1 = function () {
                tooltip_1.style.display = "block";
                updateTooltipPosition_1();
            };
            var hideTooltip_1 = function () {
                tooltip_1.style.display = "none";
            };
            ["pointerenter", "focus"].forEach(function (event) {
                return button.addEventListener(event, showTooltip_1);
            });
            ["pointerleave", "blur"].forEach(function (event) {
                return button.addEventListener(event, hideTooltip_1);
            });
            // Initial setup for the tooltip
            (0, exports.createFloatingTooltip)({
                content: tooltipContent,
                target: button,
                arrowSelector: ".dts-tooltip__arrow",
            });
        }
    });
};
exports.setupTooltips = setupTooltips;
