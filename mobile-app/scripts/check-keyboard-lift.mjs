// The lift arithmetic from KeyboardAvoider, checked against the phone the bug
// was reported on: 2400px tall, 40px status bar, 24px gesture bar, keyboard 1000px.
// Run: node scripts/check-keyboard-lift.mjs
import assert from "node:assert/strict";

const liftFor = (boxY, boxHeight, keyboardScreenY) =>
    Math.max(boxY + boxHeight - keyboardScreenY, 0);

const SCREEN = 2400, TOP = 40, BOTTOM = 24, KEYBOARD = 1000;
const keyboardScreenY = SCREEN - KEYBOARD;

// The composer sits inside a SafeAreaView, below a 200px header.
const boxY = TOP + 200;                       // window coordinates — measured
const boxHeight = SCREEN - TOP - BOTTOM - 200; // what SafeAreaView leaves us

// Lifting by this much must put the box's bottom exactly on the keyboard.
const lift = liftFor(boxY, boxHeight, keyboardScreenY);
assert.equal(boxY + boxHeight - lift, keyboardScreenY, "composer must land on the keyboard");

// What RN's own KeyboardAvoidingView computes: a parent-relative frame (so the
// header offset, without the status bar the SafeAreaView already consumed)
// against an absolute keyboard. Short by exactly the top inset — the reported bug.
const rnLift = liftFor(200, boxHeight, keyboardScreenY);
assert.equal(lift - rnLift, TOP, "RN falls short by the top inset");

// No keyboard, or a keyboard below the box: no lift, never negative padding.
assert.equal(liftFor(boxY, boxHeight, SCREEN), 0);
assert.equal(liftFor(0, 100, 5000), 0);

console.log("keyboard lift ok — clears by", lift, "px; RN would have missed by", TOP);
