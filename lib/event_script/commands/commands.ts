import { Command } from "./command_types";
import * as arg from "./arg_types";

export const functions: Record<string, Command> = {
  nop: { args: [] },

  bnz: { args: [arg.varOrInt, arg.label] },
  bez: { args: [arg.varOrInt, arg.label] },
  beq: { args: [arg.varOrInt, arg.varOrInt, arg.label] },
  bne: { args: [arg.varOrInt, arg.varOrInt, arg.label] },
  binrange: {
    args: [arg.varOrInt, arg.varOrInt, arg.varOrInt, arg.label],
  },
  boutrange: {
    args: [arg.varOrInt, arg.varOrInt, arg.varOrInt, arg.label],
  },
  b: { args: [arg.label] },

  li: { args: [arg.variable, arg.varOrInt] },
  add: { args: [arg.variable, arg.varOrInt, arg.varOrInt] },
  div: { args: [arg.variable, arg.varOrInt, arg.varOrInt] },
  sub: { args: [arg.variable, arg.varOrInt, arg.varOrInt] },
  rand: { args: [arg.variable, arg.int] },

  pushVars: { args: [null] },
  popVars: { args: [null] },

  call: { args: [arg.func] },
  end: { args: [arg.func] },
  waitFunc: { args: [arg.func] },
  wait: { args: [arg.ref] },
  msgShow: { args: [arg.msg] },
  sync: { args: [] },

  msgVar_Item: { args: [arg.msgVar, arg.varOrItem] },
  msgVar_Key: { args: [arg.msgVar, arg.varOrItem] },
  msgVar_Card: { args: [arg.msgVar, arg.varOrItem] },
  msgVar_Demon: { args: [arg.msgVar, arg.varOr(arg.demon)] },
  msgVar_Persona: { args: [arg.msgVar, arg.varOr(arg.persona)] },
  msgVar_Spell: { args: [arg.msgVar, arg.varOr(arg.spell)] },
  msgVar_Number: { args: [arg.msgVar, arg.varOrInt] },
  msgVarSet: { args: [arg.msgVar, arg.varOrInt] },
  choiceGetResult: { args: [arg.variable] },
  choiceSetResult: { args: [arg.int] },

  /***
   * Bustup
   */
  bustupLoad: { args: [arg.bustup, null] },
  bustupAlloc: { args: [arg.bustup_ref, arg.bustup_pos, arg.color, null] },
  bustupFree: { args: [arg.bustup_ref] },
  bustupWait: { args: [arg.bustup_ref] },
  bustupFade: { args: [arg.bustup_ref, arg.color, arg.int] },
  bustupFlip: { args: [arg.bustup_ref, arg.bool] },
  bustupInvert: { args: [arg.bustup_ref, arg.bool] },

  dialogAlloc: { args: [null] },
  dialogChoiceAlloc: { args: [null] },
  dialogFree: { args: [arg.ref] },

  /***
   * Camera
   */
  cameraRotateTo: { args: [arg.varOrInt, arg.int] },
  cameraRotateBy: { args: [arg.int, arg.fixedPoint] },
  cameraMoveTo: { args: [arg.int, arg.int, arg.int, arg.int] },
  cameraMoveBy: { args: [arg.int, arg.int, arg.int, arg.int] },
  cameraZoom: { args: [arg.int, arg.int] },
  cameraLookAtUnit: { args: [arg.unit, arg.short, arg.int] },
  cameraSet: { args: [arg.direction, arg.int, arg.int, arg.int] },
  cameraFollow: { args: [arg.unit] },
  cameraUnfollow: { args: [] },
  cameraSetNorth: { args: [arg.direction] },

  /***
   * Unit
   */
  unitSpriteSet: { args: [arg.unit, arg.sprite] },
  unitSpriteClear: { args: [arg.unit] },
  spriteLoad: { args: [arg.sprite] },
  unitSpawn: {
    args: [
      arg.unit,
      arg.sprite,
      arg.varOrInt,
      arg.varOrInt,
      arg.varOrInt,
      arg.directionShort,
      arg.unitFade,
    ],
  },
  unitDespawn: { args: [arg.unit, arg.unitFade] },
  unitPalette: { args: [arg.unit, arg.int] },
  unitMove: {
    args: [
      arg.unit,
      arg.varOrInt,
      arg.varOrInt,
      arg.movementEffect,
      arg.movementSpeed,
    ],
  },
  unitColor: {
    args: [arg.unit, arg.color, arg.int],
    variants: { is: [arg.unit, arg.color] },
  },
  unitColorSpeed: { args: [arg.unit, arg.color, arg.int] }, //IS only
  unitAnimationPlay: { args: [arg.unit, arg.animation, arg.int] },
  unitAnimationHold: { args: [arg.unit, arg.animation, arg.int] },
  unitAnimationStop: { args: [arg.unit] },
  unitFace_2: { args: [arg.unit, arg.directionShort] },

  unitFaceScreen: { args: [arg.unit, arg.relDirection] },
  unitLook: { args: [arg.unit, arg.lookDirection] },

  unitAllFace: {
    args: [arg.directionShort],
    variants: { is: [arg.direction] },
  },

  unitWait: { args: [arg.unit] },
  unitFacePlayer: { args: [arg.unit] },
  unitFaceUnit: { args: [arg.unit, arg.unit] },

  playerInit: { args: [arg.direction] },
  playerHide: { args: [] },
  controlDisable: { args: [] },
  controlEnable: { args: [] },
  playerConvertToUnit: { args: [arg.unit, arg.sprite, arg.directionShort] },

  unitTriggerSet: { args: [arg.unit, arg.func, arg.int, arg.int] },
  unitTriggerUnset: { args: [arg.unit] },
  unitRestoreFacing: { args: [arg.unit] },
  unitFace: { args: [arg.unit, arg.directionShort] },
  unitFace8: { args: [arg.unit, arg.direction] },
  unitRevolveAnimationPlay: { args: [arg.unit, arg.animationRevolve] },

  unitIdleOnAll: { args: [] },
  unitIdleOffAll: { args: [] },
  unitIdleOn: { args: [arg.unit] },
  unitIdleOff: { args: [arg.unit] },

  unitIdleAnimSet: { args: [arg.unit, arg.animation] },

  unitSpriteEffect: { args: [arg.unit, arg.int] }, //0 off, 1 transparent, 2 phantom, 3 both
  unitJumpTo: {
    args: [
      arg.unit,
      arg.varOrInt,
      arg.varOrInt,
      arg.varOrInt,
      arg.short, //time
      arg.short, //0 normal, 1 despawn, 2 fade
    ],
  },
  unitSpawn3d: {
    args: [
      arg.unit,
      arg.sprite,
      arg.varOrInt,
      arg.varOrInt,
      arg.varOrInt,
      arg.directionShort,
      arg.unitFade,
    ],
  },
  unitMove3d: {
    args: [
      arg.unit,
      arg.varOrInt,
      arg.varOrInt,
      arg.varOrInt,
      arg.short, //time
      arg.short, //0 normal, 1 despawn, 2 fade
    ],
  },
  unitCollisionDisable: { args: [arg.unit, arg.bool] },
  unitShadowRadius: { args: [arg.unit, arg.int] },
  unitLockDirection: { args: [arg.unit, arg.int] },
  unitLookAtUnit: { args: [arg.unit, arg.unit] },
  unitAngleToUnit: { args: [arg.unit, arg.unit, arg.variable] },

  unitColorAdjust: {
    args: [arg.unit, arg.varOrFixed, arg.varOrFixed, arg.varOrFixed],
  },
  unitDepthOffset: { args: [arg.unit, arg.int] },

  bitSet: { args: [arg.bit] },
  bitClear: { args: [arg.bit] },
  bitGet: { args: [arg.variable, arg.bit] },

  screenEffectInit: { args: [] },
  screenEffectUnknown: { args: [] },
  screenFade: { args: [arg.int, arg.int, arg.color, arg.color, arg.blend] },
  screenFadeInner: { args: [arg.color, arg.fixedPoint, arg.bool] },
  screenFadeOuter: { args: [arg.color, arg.fixedPoint, arg.bool] },
  screenFadeWait: { args: [arg.screenFade] },

  delayClear: { args: [] },
  delayWait: { args: [arg.int] },

  unitFootstepSet: { args: [arg.unit, arg.varOrsoundeffect] },
  levelFootstepSet: { args: [arg.varOrsoundeffect] },
  objShow: { args: [arg.obj, arg.bool] },

  eventFileLoad: { args: [arg.eventType, arg.int] },
  eventLoad: { args: [arg.varOrEvent] },
  dngLoad: { args: [arg.dungeon, arg.int, arg.int, arg.int, arg.int] },
  mapLoad: { args: [arg.mmap, arg.int, arg.int] },
  encounterLoad: { args: [arg.encounter] },
  encounterLoadDngscn: { args: [arg.encounter] },
  enterName: { args: [] },
  cutscenePlay: { args: [arg.cutscene, arg.int] },
  cutsceneFollowupEvent: { args: [arg.event] },
  titleScreen: { args: [] },

  casinoGameLoad: { args: [arg.casinoGame] },
  casinoGamePlay: { args: [] },
  casinoGameMachine: { args: [arg.varOrInt] },
  cutsceneFollowupCredits: { args: [] },
  disableMap: { args: [] },
  shopOpen: { args: [arg.int] }, //shop?

  shopOverlayInit: { args: [] },
  shopInventory: { args: [arg.int, arg.shopInventory] },
  shopRate: { args: [arg.int] },
  shopCurrencyType: { args: [arg.int, arg.int, arg.int] },
  shopCurrencyDisplay: { args: [arg.int, arg.int, arg.bool] },

  countGet: { args: [arg.variable, arg.counter] },
  countSet: { args: [arg.counter, arg.varOrInt] },

  enableSaving: { args: [arg.bool] },
  playerSpeedGet: { args: [arg.variable] },

  partyMemberCheck: { args: [arg.variable, arg.partyMember] },
  partyMemberAdd: { args: [arg.partyMember] },
  partyMemberRemove: { args: [arg.partyMember] },
  partyMemberRemovePermanent: { args: [arg.partyMember] },
  partyItemUnequip: { args: [arg.partyMember, arg.itemSlot] },

  partyMoneyGet: { args: [arg.variable] },
  partyHealthGet: { args: [arg.variable, arg.partyMember] },
  partyItemCount: { args: [arg.variable, arg.item] },
  partyHasPersona: { args: [arg.variable, arg.personaStock, arg.persona] },
  partyPersonaFull: { args: [arg.variable, arg.personaStock] },
  partyPersonaStockCount: { args: [arg.variable, arg.personaStock] },
  partyHasPersonaEquipped: {
    args: [arg.variable, arg.partyMember, arg.persona],
  },
  partyInfoGet: { args: [arg.variable, arg.partyMember, arg.partyInfoField] },
  partySPGet: { args: [arg.variable, arg.partyMember] },
  partyHasStatus: { args: [arg.variable, arg.partyMember, arg.partyStatus] },
  partyItemFull: { args: [arg.variable, arg.item] },
  partyMoneyAdd: { args: [arg.varOrInt] },
  partyInfoAdd: { args: [arg.partyMember, arg.partyInfoField, arg.varOrInt] },
  partyItemAdd: { args: [arg.varOrItem, arg.varOrInt] },
  partyItemTake: { args: [arg.varOrItem, arg.varOrInt] },
  partyPersonaTake: { args: [arg.personaStock, arg.persona] },
  partyPersonaGive: { args: [arg.persona, arg.bit, arg.personaStock] },
  partyPersonaEquip: { args: [arg.partyMember, arg.persona] },
  partyPersonaUnequip: { args: [arg.partyMember] },
  partyHealthRandomDamage: { args: [arg.partyMember, arg.int] },
  partySPRandomDamage: { args: [arg.partyMember, arg.int] },
  partyHealthRestore: { args: [arg.partyMember] },
  partySPRestore: { args: [arg.partyMember] },
  partyStatusSet: { args: [arg.partyMember, arg.partyStatus] },
  partyStatusHas: { args: [arg.variable, arg.partyMember, arg.partyStatus] },
  partyStatusClear: { args: [arg.partyMember] },
  partyItemEquip: { args: [arg.partyMember, arg.itemSlot, arg.item] },

  partyPersonaFree: { args: [arg.variable, arg.personaStock] },

  timerSet: { args: [arg.int, arg.event] },
  timerClear: { args: [] },

  sweepstakesEnter: { args: [arg.sweepstakes] },
  sweepstakesResult: { args: [arg.variable, arg.sweepstakes] },
  sweepstakesReward: { args: [arg.variable, arg.sweepstakes] },
  sweepstakesSteps: { args: [arg.variable, arg.sweepstakes] },

  evtbgLoad: { args: [arg.varOrEvtbg] },
  evtbgInit: {
    args: [
      arg.evtbg_handle,
      arg.varOrEvtbg,
      arg.short,
      arg.short,
      arg.color,
      arg.bool,
    ],
  },
  evtbgFade: { args: [arg.evtbg_handle, arg.color, arg.int, arg.bool] },
  evtbgFree: { args: [arg.evtbg_handle] },

  dngInfo: { args: [arg.variable, arg.dungeonInfoField] },

  sndLoad: { args: [arg.varOrSound] },
  sndMusicPlay: { args: [arg.varOrSound, arg.int] },
  sndVolumeFadeTo: { args: [arg.varOrSound, arg.int, arg.int] },
  sndVolumeFadeOff: { args: [arg.varOrSound, arg.int] },
  sndIdGet: { args: [arg.variable, null] },
  sndStop: { args: [arg.varOrSound] },
  sndVoicePlay: { args: [arg.varOrSound, arg.int] },
  sndWaitStart: { args: [] },

  envTriggerSet: {
    args: [arg.func, arg.int, arg.int, arg.collisionType, arg.collisionObj],
  },
  envTriggerClear: { args: [arg.collisionType, arg.collisionObj] },

  objCollisionLink: { args: [arg.collisionType, arg.collisionObj, arg.obj] },
  objCollisionUnlink: { args: [arg.collisionType, arg.collisionObj] },

  objAnimTranslate: { args: [arg.obj, arg.int, arg.int, arg.int, arg.int] },
  objAnimRotate: {
    args: [arg.obj, arg.int, arg.int, arg.int, arg.int, arg.int],
  },
  objAnimWait: { args: [arg.obj] },
  objAnimClear: { args: [arg.obj] },
  objVisible: { args: [arg.obj, arg.bool] },
  levelHide: { args: [] },
  levelShow: { args: [] },
  levelColorInvert: { args: [] },
  todLoad: { args: [arg.tod] },
  todRun: { args: [arg.tod, arg.int] },
  todFree: { args: [arg.tod] },

  efctDummy: { args: [arg.effect] },
  efctLoad: { args: [arg.effect] },
  efctPlay: {
    args: [
      arg.effect,
      arg.effect_handle,
      arg.int,
      arg.int,
      arg.int,
      arg.int,
      arg.int,
      arg.int,
      arg.bool,
    ],
  },
  efctUnitToUnit: {
    args: [arg.effect, arg.effect_handle, arg.unit, arg.unit, arg.bool],
  },
  efctWait: { args: [arg.effect_handle] },
  efctStop: { args: [arg.effect_handle] },
  efctAuraLoad: { args: [] },
  unitSummonEffect: { args: [arg.unit, arg.bool] },
  unitAura: { args: [arg.unit, arg.bool] },
  screenShake: { args: [arg.varOrInt] },
  screenColorAdjust: { args: [arg.varOrFixed, arg.varOrFixed, arg.varOrFixed] },

  levelPaletteAnimOn: { args: [arg.int] },
  levelPaletteAnimOff: { args: [arg.int] },
  levelWavy: { args: [arg.int, arg.int, arg.int, arg.int, arg.int] },
  screenNarrow: { args: [arg.int] },
  dialogAllocChoice: { args: [null] },
  msgLocSet: { args: [arg.int, arg.int] },
  msgLocCenter: { args: [arg.msg] },
  msgLocDefault: { args: [] },
  msgHide: { args: [] },

  textInputInit: { args: [] },
  textInputPrompt: { args: [] },
  textInputCompare: { args: [arg.msg, arg.variable] },

  unitLocation: { args: [arg.unit, arg.variable, arg.variable, arg.variable] },
  screenFlash: { args: [arg.int, arg.int, arg.int] },

  unitEfctPersona: { args: [arg.unit, arg.unit, arg.sprite] },
  unitEfctClear: { args: [arg.unit] },
  unitEfctUnit: { args: [arg.unit, arg.effect, arg.unit] },

  unknownVar1: { args: [arg.variable] },
  unknownVar2: { args: [arg.variable] },

  cutsceneFollowupMmap: { args: [arg.mmap, arg.int, arg.int] },

  screenHorizontalFadeOut: { args: [] },
  screenHorizontalFadeUnk122: { args: [] },
  screenHorizontalFadeIn: { args: [] },

  dngLoad2: { args: [arg.dungeonFloorCombo] }, //not strictly correct

  dngRoomSet: { args: [arg.int] },
  dngRoomDraw: { args: [] },
  sndMusicFree: { args: [] },
  sndUnkCF: { args: [arg.int] },

  cameraControlDisable: { args: [] },
};
