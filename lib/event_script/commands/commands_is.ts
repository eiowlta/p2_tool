//1c is set default option

/**
 * 0 used by events
 * 1 used by F_BE
 * 2 used by dngscn
 * 3 used by mmap?
 *
 */

/**
 * 16 allowed variables
 * 2 "stacks"
 */

export const ops: Record<number, string> = {
  0x0: "nop", //not used

  /** Branch **/
  0x1: "bnz",
  0x2: "bez",
  0x3: "beq",
  0x4: "bne",
  0x5: "binrange",
  0x6: "boutrange",
  0x7: "b",

  /** Variables and Math **/
  0x8: "li",
  0x9: "add",
  0xa: "sub",
  0xb: "pushVars", //dummy arg?
  0xc: "popVars", //dummy arg?
  0xd: "call",
  0xe: "end",
  0xf: "waitFunc",
  0x10: "rand",
  //11 is also wait except it doesn't check if the pointed instruction has a handler or not, it's unused
  0x12: "wait",
  0x13: "msgShow",
  0x14: "msgVar_Item",
  0x15: "msgVar_Key",
  0x16: "msgVar_Card",
  0x17: "msgVar_Demon",
  0x18: "msgVar_Persona",
  0x19: "msgVar_Spell",
  0x1a: "choiceGetResult",
  0x1b: "msgVar_Number", //formats as text
  0x1c: "bustupLoad",
  0x1d: "bustupAlloc",
  0x1e: "bustupFree",
  0x1f: "bustupLocation",
  0x20: "bustupFade",
  0x21: "bustupWait",
  0x22: "bustupFlip",
  0x23: "bustupInvert",
  0x24: "dialogAlloc",
  0x25: "dialogFree",
  0x26: "cameraRotateTo",
  0x27: "cameraRotateBy",
  0x28: "cameraMoveTo",
  0x29: "cameraMoveBy",
  0x2a: "cameraZoom",
  0x2b: "cameraLookAtUnit",
  0x2c: "cameraSet",
  0x2d: "cameraFollow",
  0x2e: "unitSpriteSet",
  0x2f: "unitSpriteClear",
  0x30: "spriteLoad",
  0x31: "unitSpawn",
  0x32: "unitDespawn",
  0x33: "unitPalette",
  0x34: "unitMove",
  0x35: "unitColor", //speed fixed to 32
  0x36: "unitColorSpeed",
  0x37: "unitAnimationPlay",
  0x38: "unitAnimationHold",
  0x39: "unitAnimationStop",
  0x3a: "unitFace",
  0x3b: "unitFaceScreen",
  0x3c: "unitLook",
  0x3d: "unitAllFace",
  0x3e: "unitWait",
  0x3f: "unitFacePlayer",
  0x40: "unitFaceUnit",
  0x41: "playerInit",
  //0x42: "",
  0x43: "controlDisable",
  //0x44: "",
  0x45: "playerConvertToUnit",
  //0x46: "",
  0x47: "unitTriggerUnset",
  //0x48: "",
  //0x49: "",
  0x4a: "unitFace8",
  //0x4b: "",
  //0x4c: "",
  //0x4d: "",
  //0x4e: "",
  0x4f: "unitIdleAnimSet",
  0x50: "unitSpriteEffect",
  0x51: "dngLoad",
  0x52: "eventFileLoad",
  //0x53: "",
  //0x54: "",
  //0x55: "",
  //   0x56: "shopOpen",
  //0x57: "",
  //0x58: "",
  //0x59: "",
  //0x5a: "",
  //0x5b: "",
  0x5c: "delayClear",
  0x5d: "delayWait",
  0x5e: "bitSet",
  0x5f: "bitClear",
  0x60: "bitGet",
  //0x61: "",
  //0x62: "",
  //0x63: "",
  0x64: "partyMemberCheck",
  0x65: "partyMemberRemove",
  0x66: "partyMemberAdd",
  0x67: "partyItemUnequip",
  0x69: "partyHealthGet",
  0x6a: "partyItemCount",
  0x6b: "partyPersonaHas",
  0x6c: "partyPersonaEquipped",
  0x6d: "partyInfoGet",
  0x6e: "partySPGet",
  0x6f: "partyStatusHas",
  0x70: "partyItemFull",
  0x71: "partyPersonaFull",
  //0x72: "",
  0x73: "partyInfoAdd",
  0x74: "partyItemAdd",
  0x75: "partyItemTake",
  //0x76: "",
  //0x77: "",
  0x78: "partyPersonaUnequip",
  //0x79: "",
  //0x7a: "",
  0x7b: "partySPRandomDamage",
  0x7d: "partyStatusSet",
  0x7e: "partyStatusClear",
  0x7f: "partyItemEquip",
  //0x80: "",
  //0x81: "",
  //0x82: "",
  //0x83: "",
  //0x84: "",
  //0x85: "",
  //0x86: "",
  //0x87: "",
  //0x88: "",
  //0x89: "",
  //   0x8a: "playerSpeedGet",
  //   0x8b: "playerSpeedGet",
  //   0x8c: "b2",
  //   0x8d: "b2",
  //0x8e: "",
  0x8f: "evtbgInit",
  0x90: "evtbgFade",
  //0x91: "",
  0x92: "screenFade",
  0x93: "screenFadeInner",
  0x94: "screenFadeOuter",
  0x95: "screenFadeWait",
  //   0x96: "be",
  0x97: "dngInfo",
  //0x98: "",
  //0x99: "",
  //0x9a: "",
  //0x9b: "",
  //0x9c: "",
  //0x9d: "",
  0x9e: "sndStop",
  //   0x9f: "c7",
  0xa0: "sndIdGet",
  //0xa0: "",
  //0xa1: "",
  //0xa2: "",
  //0xa3: "",
  //0xa4: "",
  0xa5: "objAnimTranslate",
  0xa6: "objAnimRotate",
  0xa7: "objAnimWait",
  0xa8: "objAnimClear",
  0xa9: "objVisible",
  0xaa: "levelHide",
  0xab: "levelShow",
  0xac: "levelColorInvert",
  0xad: "unitIdleOff",
  //0xae: "",
  0xaf: "unitIdleOffAll",
  //0xb0: "",
  //0xb1: "",
  //0xb2: "",
  //0xb3: "",
  //0xb4: "",
  //0xb5: "",
  //0xb6: "",
  0xb7: "unitFootstepSet",
  //0xb8: "",
  //0xb9: "",
  //   0xba: "ec",
  //   0xbc: "107",
  0xbd: "sndWaitStart",
  //0xbe: "",
  //0xbf: "",
  0xc0: "casinoGamePlay",
  0xc1: "casinoGameMachine",
  0xc2: "todRun",
  //0xc3: "",
  //0xc4: "",
  //0xc5: "",
  //0xc6: "",
  //0xc7: "",
  //0xc8: "",
  //0xc9: "",
  //0xca: "",
  //0xcb: "",
  //0xcc: "",
  //0xcd: "",
  //   0xce: "choiceSetResult",
  //0xcf: "",
  0xd0: "unitSpawn3d",
  //0xd1: "",
  0xd2: "unitMove3d",
  //0xd3: "",
  0xd4: "countSet",
  //0xd5: "",
  //   0xd6: "7e",
  //   0xd7: "7f",
  //0xd8: "",
  //0xd9: "",
  //0xda: "",
  //0xdb: "",
  //0xdc: "",
  //   0xdd: "f2",
  //0xde: "",
  //0xdf: "",
  //   0xe0: "f5",
  //0xe1: "",
  //   0xe2: "shopOpen",
  //0xe3: "",
  //0xe4: "",
  0xe5: "efctWait",
  0xe6: "screenColorAdjust",
  0xe7: "unitShadowRadius",
  //0xe8: "",
  //0xe9: "",
  0xea: "unitAttachToObj",
  //   0xeb: "80",
  0xec: "levelWavy",
  //0xed: "",
  //0xee: "",
  //   0xef: "76",
  0xf0: "unitAura",
  //0xf1: "",
  //0xf2: "",
  //0xf3: "",
  //0xf4: "",
  //0xf5: "",
  //   0xf6: "cd",
  0xf7: "cutsceneFollowupCredits",
  //0xf8: "",
  //0xf9: "",
  0xfa: "unitLockDirection",
  //0xfb: "",
  //   0xfc: "58",
  //0xfd: "",
  //0xfe: "",
  //0xff: "",
  //0x100: "",
  //0x101: "",
  //   0x102: "sndUnkCF",
  //0x103: "",
  //   0x104: "5a",
  //0x105: "",
  //0x106: "",
  0x107: "partyMemberRemovePermanent",
  //0x108: "",
  0x109: "unitDepthOffset",

  /** Bustup **/
  // 0x1e: "bustupLoad",
  // 0x1f: "bustupAlloc",
  // 0x20: "bustupFree",
  // 0x21: "bustupLocation",
  // 0x22: "bustupFade", //second arg (3rd in alloc) is color multiplier
  // 0x23: "bustupWait", //basically identical to wait, except it checks if you're in a shop
  // 0x24: "bustupFlip",
  // 0x25: "bustupInvert",

  // /** Dialog **/
  // 0x26: "dialogAlloc",
  // 0x27: "dialogFree",

  // /** Camera **/
  // 0x28: "cameraRotateTo", //direction(orvar), time
  // 0x29: "cameraRotateBy", //degrees, clockwise
  // 0x2a: "cameraMoveTo", //x, y, z (absolute position), time
  // 0x2b: "cameraMoveBy", //x,y,z (relative), time
  // 0x2c: "cameraZoom", //zoom factor?, time
  // 0x2d: "cameraLookAtUnit", //unit_handle, ???, time.  middle is a slight offset, can be 0-3 but 0 and 3 are identical?
  // 0x2e: "cameraSet",
  // 0x2f: "cameraFollow",
  // 0x30: "cameraSetNorth", //overrides direction used by setCamera ...why?

  // /** Unit **/
  // 0x31: "unitSpriteSet",
  // 0x32: "unitSpriteClear", //also hides
  // 0x33: "spriteLoad",
  // 0x34: "unitSpawn",
  // 0x35: "unitDespawn", //handle, what is the second parameter for??
  // 0x36: "unitPalette", //handle, palette id
  // 0x37: "unitMove", //handle, x, y, z, ??
  // 0x38: "unitColor", //handle, color, time
  // 0x39: "unitAnimationPlay", //handle, anim, count //for repeatable animations, controls number of repeats
  // 0x3a: "unitAnimationHold", //handle, anim, time  //for animations with hold time, controls how long the "hold" bit is held for.  -1 is forever, or until a stopAnimation
  // 0x3b: "unitAnimationStop",
  // 0x3c: "unitFace_2", //unit, abs (duplicate of 0x4b)
  // 0x3d: "unitFaceScreen", //unit, direction
  // 0x3e: "unitLook", //unit, direction

  // 0x3f: "unitAllFace",

  // 0x40: "unitWait",
  // 0x41: "unitFacePlayer",
  // 0x42: "unitFaceUnit",

  // 0x43: "playerInit", //direction
  // 0x44: "playerHide",
  // 0x45: "controlDisable", //disable player control and hide ui
  // 0x46: "controlEnable", //enable player control and hide ui
  // 0x47: "playerConvertToUnit", //handle, sprite, directionShort

  // 0x48: "unitTriggerSet",
  // 0x49: "unitTriggerUnset",
  // 0x4a: "unitRestoreFacing", //restore facing direction

  // 0x4b: "unitFace", //unit, abs
  // 0x4c: "unitFace8", //unit, abs8
  // 0x4d: "unitRevolveAnimationPlay", //unit, animrevolve (animations that can be viewed from any angle.  not truly 3d)

  // 0x4e: "unitIdleOnAll",

  // 0x4f: "unitIdleAnimSet", //unit, frame (disables idle animation and after a delay switchs to a frame?)
  // 0x50: "unitSpriteEffect",
  // 0x51: "unitJumpTo", //unit, x, y, z, height, effect
  // 0x52: "unitSpawn3d", //same as spawn, but can ignore level geometry
  // 0x53: "unitCollisionDisable", //
  // 0x54: "unitMove3d", //unit x, y, z, speed?, effect
  // 0x55: "unitShadowRadius",
  // 0x56: "unitAttachToObj", //unit, object, -1 is detach
  // 0x57: "unitLockDirection", //unit, direction8, -1 is unlock

  // //0x58: seems to just update the unit position relative to it's parent object
  // 0x59: "unitColorAdjust", //color is multiplied by value without affecting original color, fixed point
  // //0x5a: ???
  // 0x5b: "unitDepthOffset", //adjust zbuff depth
  // 0x5c: "unitLookAtUnit", //unit, unit
  // 0x5d: "unitAngleToUnit", //unit, unit, variable

  // 0x5e: "dngLoad", //used in tatsuyas scenario, dungeon, floor, x, y, ?? same as bf
  // 0x5f: "eventFileLoad", //e or m, number, used in tatsuya, mmap and shops
  // 0x60: "mapLoad", //mmap number, junction?, ?
  // // 0x61: "encounterLoadDngscn", //load encounter in dngscn?
  // 0x62: "encounterLoad",
  // 0x63: "enterName",
  // 0x64: "cutscenePlay", //cutscene, unused, written but not read?
  // 0x65: "cutsceneFollowupEvent", //event
  // 0x66: "titleScreen",
  // 0x67: "casinoGameLoad",
  // 0x68: "casinoGamePlay",
  // 0x69: "casinoGameMachine", //sets machine for slots/poker which affects odds
  // 0x6a: "saveGame",
  // 0x6b: "cutsceneFollowupCredits",
  // 0x6c: "disableMap",
  // 0x6d: "shopOpen", //shop
  // 0x6e: "shopOverlayInit",
  // 0x6f: "shopInventory", //some kind of ID, inventory.  id 3 is very weird
  // 0x70: "shopRate", //cost percent
  // //0x71: unused in event (NULL)
  // 0x72: "shopCurrencyType", //type, x, y //x/y ignored.  type 9=coin, 8=yen, 5=casino timer
  // 0x73: "shopCurrencyDisplay", //x, y, hide //x y ignored,
  // //   0x74: "", //exists but empty
  // // 0x75: "debugMarkerOn", //id, nothing?
  // // 0x76: "debugMarkerOff",  //id,

  // 0x77: "delayClear",
  // 0x78: "delayWait",
  // 0x79: "bitSet",
  // 0x7a: "bitClear",
  // 0x7b: "bitGet",
  // 0x7c: "countSet", //8 shorts, persistant
  // 0x7d: "countGet",
  // //   0x7e: "varSet", //set of 8 shorts accessible.  not persisted or anything
  // //   0x7f: "varGet",

  // //   0x80: "",//same as eventLoad, only seems to affect room name though
  // 0x81: "enableSaving",
  // 0x82: "playerSpeedGet", //0-2 (3?)

  // 0x83: "partyMemberCheck",
  // 0x84: "partyMemberRemove",
  // 0x85: "partyMemberAdd",

  // 0x86: "partyItemUnequip",

  // 0x87: "partyMoneyGet",
  // 0x88: "partyHealthGet",
  // 0x89: "partyItemCount",
  // 0x8a: "partyPersonaHas", //variable, stock, persona
  // 0x8b: "partyPersonaEquipped", //variable, member, persona
  // 0x8c: "partyInfoGet", //variable, member, field
  // 0x8d: "partySPGet", //variable, member
  // 0x8e: "partyStatusHas", //variable, member, status
  // 0x8f: "partyItemFull", //variable, item
  // 0x90: "partyPersonaFull", //variable, stock
  // 0x91: "partyMoneyAdd",
  // 0x92: "partyInfoAdd", //member, field, value
  // 0x93: "partyItemAdd", //item, count
  // 0x94: "partyItemTake", //item, count
  // 0x95: "partyPersonaTake", //persona, stock
  // 0x96: "partyPersonaGive", //persona, bit, stock
  // 0x97: "partyPersonaUnequip", //party
  // 0x98: "partyHealthRandomDamage", //party, max
  // 0x99: "partyHealthRestore", //party
  // 0x9a: "partySPRandomDamage", //party, max
  // 0x9b: "partySPRestore", //party
  // 0x9c: "partyStatusSet", //party, status
  // 0x9d: "partyStatusClear", //party
  // 0x9e: "partyItemEquip", //party, slot, item
  // 0x9f: "partyPersonaEquip", //party, persona
  // 0xa0: "partyPersonaFree", //party, stock

  // 0xa1: "partyMemberRemovePermanent", //will be reinitialized if added again, used on nanjo/elly
  // //0xa2-a5 are dummy and unused
  // 0xa6: "timerSet", //time, failureevent
  // 0xa7: "timerClear",

  // 0xa8: "screenEffectInit", //does nothing in PSP
  // 0xa9: "screenEffectUnknown", //assumption, does nothing in psp
  // //0xaa: "",//dummy, unused
  // //   0xab:"", //dummy, used??
  // //0xac: "",//dummy, used
  // //0xad: "",//dummy, unused
  // //0xae: "",//unused, checks if any of the sweepstakes bits are set?
  // 0xaf: "sweepstakesEnter",
  // 0xb0: "sweepstakesResult",
  // 0xb1: "sweepstakesReward",
  // //0xb2:'' //?? seemingly sweepstakes related but unused. saves never written value to variable
  // 0xb3: "sweepstakesSteps",

  // 0xb4: "evtbgLoad",
  // 0xb5: "evtbgInit", //handle, image, ?, ?, color, unknown bool //the two unknowns are shorts, likely x/y but they're always 0 so it's unused.  bool is never used but always 1
  // 0xb6: "evtbgFade", //handle, color, time, hide
  // 0xb7: "evtbgFree",
  // //0xb8: "", dummy, unused

  // 0xb9: "screenFade",
  // 0xba: "screenFadeInner",
  // 0xbb: "screenFadeOuter",

  // 0xbc: "screenFadeWait",
  // // 0xbd: "screenDummyBD", //cutscene and screen fade related
  // //   0xbe: "eventLoad_2", //unused, same as eventLoad?

  // 0xbf: "dngInfo", // var, [x/y, y/x, dungeon, floor, "door"?]

  // 0xc0: "dngRoomSet", //sets with arg0
  // //0xc1: "", //dummy unused

  // 0xc2: "sndLoad", //dummy, sound automatically loadde
  // 0xc3: "sndMusicPlay", //sound, volume
  // 0xc4: "sndVolumeFadeTo", //sound, volume, time
  // 0xc5: "sndVolumeFadeOff", //sound, time
  // 0xc6: "sndStop",
  // //0xc7: "sndWait", //not actually implemented, unused

  // 0xc8: "sndIdGet",
  // 0xc9: "sndVoicePlay",
  // //0xca: "", //dummy, unused
  // 0xcb: "sndMusicFree", //I think, sends event 2 to sound thread
  // 0xcc: "sndWaitStart",
  // //0xcd: '',//unused, some kind of wait
  // //0xce: '',//dummy, unused
  // //0xcf: '', saves or restores a song, parameter is ignored, unknown really.  should check psx
  // 0xcf: "sndUnkCF",

  // 0xd0: "envTriggerSet",
  // 0xd1: "envTriggerClear",

  // 0xd2: "objCollisionLink",
  // 0xd3: "objCollisionUnlink",
  // 0xd4: "objAnimTranslate", //obj, x, y, z, time
  // 0xd5: "objAnimRotate", //obj, x, y, z, time, ?? (maybe global/local?) in degrees
  // 0xd6: "objAnimWait",
  // 0xd7: "objAnimClear",
  // 0xd8: "objVisible",
  // 0xd9: "levelHide", //
  // 0xda: "levelShow", //
  // 0xdb: "levelColorInvert",
  // 0xdc: "todRun", //tod, loop?
  // 0xdd: "todLoad",
  // 0xde: "todFree",

  // 0xdf: "unitIdleOff",
  // 0xe0: "unitIdleOn",
  // 0xe1: "unitIdleOffAll",
  // 0xe2: "cameraControlDisable", //can't rotate anymore
  // //0xe3-0xe7 are undefined
  // //0xe8: dummy, unused

  // 0xe9: "unitFootstepSet",
  // 0xea: "levelFootstepSet", //sets a global variable, used to initialize
  // 0xeb: "unitFootstepSetAll", //sets each unit individually
  // //0xec: '', ?????, unused though
  // //0xed-0xf0 dummy

  // //these are unused but implemented? haven't gotten them to work
  // // 0xf1: "efctLoad",
  // // 0xf2: "efctSpawn",
  // // // 0xf3: "",??
  // // 0xf4: "efctFree",
  // // 0xf5: "efctWait",
  // // 0xf6: '',//

  // 0xf6: "efctDummy", //paired with f7, does nothing
  // 0xf7: "efctLoad",
  // 0xf8: "efctPlay", //effect, handle, src (x,y,z), dst(x,y,yz), repeat
  // 0xf9: "efctUnitToUnit", //effect, handle, unit src, unit dst
  // 0xfa: "efctWait",
  // 0xfb: "efctStop", //breaks loops
  // 0xfc: "unitSummonEffect", //handle, bool
  // 0xfd: "unitAura",
  // 0xfe: "screenShake", //magnitude
  // 0xff: "screenColorAdjust",
  // 0x100: "levelPaletteAnimOn",
  // 0x101: "levelPaletteAnimOff",
  // 0x102: "levelWavy", //all parameters are ignored...
  // 0x103: "screenNarrow", //circular narrowing of vision effect, argument -1 off, 0-4 index an array that control darkness, and how much is covered.  not in order
  // //104-106 unpopulated

  // //   0x107: ??, I assume this was debug related

  // 0x109: "dialogChoiceAlloc", //almost identical to dialogAlloc, skips zeroing a few variables?
  // 0x10a: "msgLocSet", //x,y
  // 0x10b: "msgLocCenter", //msg
  // 0x10c: "msgLocDefault", //40, 200

  // 0x10d: "textInputInit",
  // 0x10e: "textInputPrompt",
  // 0x10f: "textInputCompare", //msg for comparing, variable.  puts line number of match in variable

  // 0x110: "unitLocation", //unit, varx,vary,varz, get unit coordinates
  // 0x111: "screenFlash", //r, g, b

  // 0x112: "unknownVar1", //?? loads something into a variable, related to dungeon or mmap
  // 0x113: "dngLoad2", //(dungeon<<8) | floor

  // 0x114: "unitEfctPersona", //new unit at same location but a bit higher, src, new handle, sprite sheet
  // 0x115: "unitEfctClear", //unit, also clears aura
  // 0x116: "unitEfctUnit", //unit to unit but uses handle 0 and does not loop

  // 0x117: "cameraUnfollow",

  // //118-11a are dummy

  // 0x11b: "unknownVar2",

  // 0x11c: "div",

  // 0x11d: "cutsceneFollowupMmap", //mmap number, location, visible plaque, same as mapLoad actually
  // //11e, dummy unused efct related

  // 0x11f: "dngRoomDraw", //paired with c0

  // 0x120: "mapCity",
  // 0x121: "screenHorizontalFadeOut",
  // 0x122: "screenHorizontalFadeUnk122", //just sets the fade bit to be enabled but doesn't do anything else
  // 0x123: "screenHorizontalFadeIn",

  // 0x124: "efctAuraLoad",

  // // 0x125: "", //clears two variables, maybe related to mmap stuff?
  // //126, dummy, unused
  // //127, dummy, used, efct related
  // //128, dummy, used, unit aura/summon effect related
  // 0x129: "exResult", //results of ex dungeon

  // 0x12a: "msgVarSet",
  // 0x12b: "eventLoad",
  // 0x12c: "partyPersonaStockCount", //var, stock
  // 0x12d: "efctAuraColor", //0 blue, 1 yellow, others?
};

//   export const ops_dngscn: Record<number, string> = {
//     ...ops,
//     // 0x24: undefined,
//     0x61: "encounterLoad", //load encounter in dngscn?

//     // 0x62: "encounterLoad",
//     0x63: "enterName",
//     0x64: "cutscenePlay", //cutscene, unused, written but not read?
//     0x65: "cutsceneFollowupEvent", //event
//     0x66: "titleScreen",
//     0x67: "casinoGameLoad",
//     0x68: "casinoGamePlay",
//     0x69: "casinoGameMachine", //sets machine for slots/poker which affects odds
//     0x6a: "saveGame",
//     0x6b: "cutsceneFollowupCredits",
//     0x6c: "disableMap",
//     0x6d: "shopOpen", //shop
//     0x6e: "shopOverlayInit",
//     0x6f: "shopInventory", //some kind of ID, inventory.  id 3 is very weird
//     0x70: "shopRate", //cost percent
//     //0x71: unused in event (NULL)
//     0x72: "shopCurrencyType", //type, x, y //x/y ignored.  type 9=coin, 8=yen, 5=casino timer
//     0x73: "shopCurrencyDisplay", //x, y, hide //x y ignored,
//     //   0x74: "", //exists but empty
//     // 0x75: "debugMarkerOn", //id, nothing?
//     // 0x76: "debugMarkerOff",  //id,

//     0x77: "delayClear",
//     0x78: "delayWait",
//     0x79: "bitSet",
//     0x7a: "bitClear",
//     0x7b: "bitGet",
//     0x7c: "countSet", //8 shorts, persistant
//     0x7d: "countGet",
//     //   0x7e: "varSet", //set of 8 shorts accessible.  not persisted or anything
//     //   0x7f: "varGet",

//     //   0x80: "",//same as eventLoad, only seems to affect room name though
//     0x81: "enableSaving",
//     0x82: "playerSpeedGet", //0-2 (3?)

//     0x83: "partyMemberCheck",
//     0x84: "partyMemberRemove",
//     0x85: "partyMemberAdd",

//     0x86: "partyItemUnequip",

//     0x87: "partyMoneyGet",
//     0x88: "partyHealthGet",
//     0x89: "partyItemCount",
//     0x8a: "partyPersonaHas", //variable, stock, persona
//     0x8b: "partyPersonaEquipped", //variable, member, persona
//     0x8c: "partyInfoGet", //variable, member, field
//     0x8d: "partySPGet", //variable, member
//     0x8e: "partyStatusHas", //variable, member, status
//     0x8f: "partyItemFull", //variable, item
//     0x90: "partyPersonaFull", //variable, stock
//     0x91: "partyMoneyAdd",
//     0x92: "partyInfoAdd", //member, field, value
//     0x93: "partyItemAdd", //item, count
//     0x94: "partyItemTake", //item, count
//     0x95: "partyPersonaTake", //persona, stock
//     0x96: "partyPersonaGive", //persona, bit, stock
//     0x97: "partyPersonaUnequip", //party
//     0x98: "partyHealthRandomDamage", //party, max
//     0x99: "partyHealthRestore", //party
//     0x9a: "partySPRandomDamage", //party, max
//     0x9b: "partySPRestore", //party
//     0x9c: "partyStatusSet", //party, status
//     0x9d: "partyStatusClear", //party
//     0x9e: "partyItemEquip", //party, slot, item
//     0x9f: "partyPersonaEquip", //party, persona
//     0xa0: "partyPersonaFree", //party, stock

//     0xa1: "partyMemberRemovePermanent", //will be reinitialized if added again, used on nanjo/elly
//     //0xa2-a5 are dummy and unused
//     0xa6: "timerSet", //time, failureevent
//     0xa7: "timerClear",

//     0xa8: "screenEffectInit", //does nothing in PSP
//     0xa9: "screenEffectUnknown", //assumption, does nothing in psp
//     //0xaa: "",//dummy, unused
//     //   0xab:"", //dummy, used??
//     //0xac: "",//dummy, used
//     //0xad: "",//dummy, unused
//     //0xae: "",//unused, checks if any of the sweepstakes bits are set?
//     0xaf: "sweepstakesEnter",
//     0xb0: "sweepstakesResult",
//     0xb1: "sweepstakesReward",
//     //0xb2:'' //?? seemingly sweepstakes related but unused. saves never written value to variable
//     0xb3: "sweepstakesSteps",

//     0xb4: "evtbgLoad",
//     0xb5: "evtbgInit", //handle, image, ?, ?, color, unknown bool //the two unknowns are shorts, likely x/y but they're always 0 so it's unused.  bool is never used but always 1
//     0xb6: "evtbgFade", //handle, color, time, hide
//     0xb7: "evtbgFree",
//     //0xb8: "", dummy, unused

//     0xb9: "screenFade",
//     0xba: "screenFadeInner",
//     0xbb: "screenFadeOuter",

//     0xbc: "screenFadeWait",
//     // 0xbd: "screenDummyBD", //cutscene and screen fade related
//     //   0xbe: "eventLoad_2", //unused, same as eventLoad?

//     0xbf: "dngInfo", // var, [x/y, y/x, dungeon, floor, "door"?]

//     0xc0: "dngRoomSet", //sets with arg0
//     //0xc1: "", //dummy unused

//     0xc2: "sndLoad", //dummy, sound automatically loadde
//     0xc3: "sndMusicPlay", //sound, volume
//     0xc4: "sndVolumeFadeTo", //sound, volume, time
//     0xc5: "sndVolumeFadeOff", //sound, time
//     0xc6: "sndStop",
//     //0xc7: "sndWait", //not actually implemented, unused

//     0xc8: "sndIdGet",
//     0xc9: "sndVoicePlay",
//     //0xca: "", //dummy, unused
//     0xcb: "sndMusicFree", //I think, sends event 2 to sound thread
//     0xcc: "sndWaitStart",
//     //0xcd: '',//unused, some kind of wait
//     //0xce: '',//dummy, unused
//     //0xcf: '', saves or restores a song, parameter is ignored, unknown really.  should check psx
//     0xcf: "sndUnkCF",

//     0xd0: "envTriggerSet",
//     0xd1: "envTriggerClear",

//     0xd2: "objCollisionLink",
//     0xd3: "objCollisionUnlink",
//     0xd4: "objAnimTranslate", //obj, x, y, z, time
//     0xd5: "objAnimRotate", //obj, x, y, z, time, ?? (maybe global/local?) in degrees
//     0xd6: "objAnimWait",
//     0xd7: "objAnimClear",
//     0xd8: "objVisible",
//     0xd9: "levelHide", //
//     0xda: "levelShow", //
//     0xdb: "levelColorInvert",
//     0xdc: "todRun", //tod, loop?
//     0xdd: "todLoad",
//     0xde: "todFree",

//     0xdf: "unitIdleOff",
//     0xe0: "unitIdleOn",
//     0xe1: "unitIdleOffAll",
//     0xe2: "cameraControlDisable", //can't rotate anymore
//     //0xe3-0xe7 are undefined
//     //0xe8: dummy, unused

//     0xe9: "unitFootstepSet",
//     0xea: "levelFootstepSet", //sets a global variable, used to initialize
//     0xeb: "unitFootstepSetAll", //sets each unit individually
//     //0xec: '', ?????, unused though
//     //0xed-0xf0 dummy

//     //these are unused but implemented? haven't gotten them to work
//     // 0xf1: "efctLoad",
//     // 0xf2: "efctSpawn",
//     // // 0xf3: "",??
//     // 0xf4: "efctFree",
//     // 0xf5: "efctWait",
//     // 0xf6: '',//

//     0xf6: "efctDummy", //paired with f7, does nothing
//     0xf7: "efctLoad",
//     0xf8: "efctPlay", //effect, handle, src (x,y,z), dst(x,y,yz), repeat
//     0xf9: "efctUnitToUnit", //effect, handle, unit src, unit dst
//     0xfa: "efctWait",
//     0xfb: "efctStop", //breaks loops
//     0xfc: "unitSummonEffect", //handle, bool
//     0xfd: "unitAura",
//     0xfe: "screenShake", //magnitude
//     0xff: "screenColorAdjust",
//     0x100: "levelPaletteAnimOn",
//     0x101: "levelPaletteAnimOff",
//     0x102: "levelWavy", //all parameters are ignored...
//     0x103: "screenNarrow", //circular narrowing of vision effect, argument -1 off, 0-4 index an array that control darkness, and how much is covered.  not in order
//     //104-106 unpopulated

//     //   0x107: ??, I assume this was debug related

//     0x109: "dialogChoiceAlloc", //almost identical to dialogAlloc, skips zeroing a few variables?
//     0x10a: "msgLocSet", //x,y
//     0x10b: "msgLocCenter", //msg
//     0x10c: "msgLocDefault", //40, 200

//     0x10d: "textInputInit",
//     0x10e: "textInputPrompt",
//     0x10f: "textInputCompare", //msg for comparing, variable.  puts line number of match in variable

//     0x110: "unitLocation", //unit, varx,vary,varz, get unit coordinates
//     0x111: "screenFlash", //r, g, b

//     0x112: "unknownVar1", //?? loads something into a variable, related to dungeon or mmap
//     0x113: "dngLoad2", //(dungeon<<8) | floor

//     0x114: "unitEfctPersona", //new unit at same location but a bit higher, src, new handle, sprite sheet
//     0x115: "unitEfctClear", //unit, also clears aura
//     0x116: "unitEfctUnit", //unit to unit but uses handle 0 and does not loop

//     0x117: "cameraUnfollow",

//     //118-11a are dummy

//     0x11b: "unknownVar2",

//     0x11c: "div",

//     0x11d: "cutsceneFollowupMmap", //mmap number, location, visible plaque, same as mapLoad actually
//     //11e, dummy unused efct related

//     0x11f: "dngRoomDraw", //paired with c0

//     0x120: "mapCity",
//     0x121: "screenHorizontalFadeOut",
//     0x122: "screenHorizontalFadeUnk122", //just sets the fade bit to be enabled but doesn't do anything else
//     0x123: "screenHorizontalFadeIn",

//     0x124: "efctAuraLoad",

//     // 0x125: "", //clears two variables, maybe related to mmap stuff?
//     //126, dummy, unused
//     //127, dummy, used, efct related
//     //128, dummy, used, unit aura/summon effect related
//     0x129: "exResult", //results of ex dungeon

//     0x12a: "msgVarSet",
//     0x12b: "eventLoad",
//     0x12c: "partyPersonaStockCount", //var, stock
//     0x12d: "efctAuraColor", //0 blue, 1 yellow, others?
//   };
