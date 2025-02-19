let fs = require("fs");

// let bits = fs.readFileSync("bits.txt", "utf-8").split("\n");
let bustup = JSON.parse(fs.readFileSync("../misc/bustup.json", "utf-8"));
// let key_items = JSON.parse(fs.readFileSync("../misc/key_items.json", "utf-8"));
// let items = JSON.parse(fs.readFileSync("../misc/items.json", "utf-8"));
// let cards = [
//   "dummy_card",
//   "magician",
//   "priestess",
//   "empress",
//   "emperor",
//   "hierophant",
//   "lovers",
//   "chariot",
//   "strength",
//   "hermit",
//   "fortune",
//   "justice",
//   "hanged_man",
//   "death",
//   "temperance",
//   "devil",
//   "tower",
//   "star",
//   "moon",
//   "sun",
//   "judgement",
//   "world",
//   "fool",
//   "free_tarot",
//   "dancing_mask",
//   "waterlily_petal",
//   "netherworld_path",
//   "cradle_of_creation",
//   "skull_necklace",
//   "avatar",
//   "rune_monument",
//   "masamunes_eyepatch",
//   "amber_glasses",
//   "buddhas_words",
//   "champion",
//   "maxi_tempest",
//   "urdarbrunner",
//   "ancient_sun",
//   "generals_piece",
//   "pao_pei",
//   "black_goat",
//   "bronze_ring",
//   "styx",
//   "crimson_wing",
//   "morning_star",
//   "king_in_yellow",
//   "ortyx",
//   "rainbow_light",
//   "month_of_ur",
//   "silver_bow",
//   "1000_lotus_petals",
//   "dordonas_oar",
//   "prosecutors_diary",
//   "lily",
//   "noatun",
//   "fuumas_grimoire",
//   "agi_card",
//   "agilao_card",
//   "agidyne_card",
//   "maragi_card",
//   "maragion_card",
//   "inferno_card",
//   "aqua_card",
//   "aques_card",
//   "aquadyne_card",
//   "malaqua_card",
//   "malaques_card",
//   "torrent_card",
//   "garu_card",
//   "garula_card",
//   "garudyne_card",
//   "magaru_card",
//   "magarula_card",
//   "gale_card",
//   "magna_card",
//   "magnara_card",
//   "magnadyne_card",
//   "mamagna_card",
//   "mamagnara_card",
//   "quake_card",
//   "bufu_card",
//   "bufula_card",
//   "frigid_card",
//   "zio_card",
//   "zionga_card",
//   "thunderbolt_card",
//   "frei_card",
//   "freila_card",
//   "scorching_card",
//   "zan_card",
//   "zanma_card",
//   "wavelength_card",
//   "gry_card",
//   "gryva_card",
//   "pressure_card",
//   "megido_card",
//   "megidola_card",
//   "nuclear_card",
//   "dia_card",
//   "diarama_card",
//   "healing_card",
//   "media_card",
//   "medirama_card",
//   "blessing_card",
//   "posumudi_card",
//   "kotoludi_card",
//   "patra_card",
//   "me patra_card",
//   "recarm_card",
//   "holylight_card",
//   "sacrifice_card",
//   "dormina_card",
//   "poisma_card",
//   "marin karin_card",
//   "pulinpa_card",
//   "mafui_card",
//   "balzac_card",
//   "illuzone_card",
//   "tarukaja_card",
//   "rakukaja_card",
//   "makakaja_card",
//   "samakaja_card",
//   "sukukaja_card",
//   "dekaja_card",
//   "tetraja_card",
//   "attack mirror_card",
//   "magic mirror_card",
//   "estoma_card",
//   "open door_card",
//   "st_card",
//   "vi_card",
//   "dx_card",
//   "ag_card",
//   "lu_card",
//   "all_card",
// ];
// let items = JSON.parse(fs.readFileSync("./item.json"));

// let obj = {};
// for(const key in items) {
//     if(obj[items[key]] != undefined) console.log(obj[items[key]], key, items[key])
//     obj[items[key]] = key;
// }

let len = Object.keys(bustup)
  .map((a) => parseInt(a))
  .reduce((p, c) => Math.max(p, c), 0);
// let len = items.length;
let obj = {};
for (let i = 0; i < len; i++) {
  if (bustup[i] !== undefined)
    obj[(i | 0x0000).toString(16).padStart(4, "0")] = bustup[i].name;
}
fs.writeFileSync("bustup.json", JSON.stringify(obj, null, 2));
// len = key_items.length;
// for (let i = 0; i < len; i++) {
//   //   obj[i.toString(16).padStart(4, '0')] = bits[i];
//   obj[(i | 0x1000).toString(16).padStart(4, "0")] = key_items[i];
// }
// len = cards.length;
// for (let i = 0; i < len; i++) {
//   obj[(i | 0x2000).toString(16).padStart(4, "0")] = cards[i];
// }
// let kv = Object.entries(obj);
// kv.sort((a,b)=>parseInt(a[0], 16)-parseInt(b[0],16));

// fs.writeFileSync("item.json", `{
//     ${kv.map(a=>{
//         return `"${a[0]}": "${a[1]}"`
//     }).join(',\n\t')}
// }`);
