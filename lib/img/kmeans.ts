// let random_sample = (S, k) => {
//   let samples = [];
//   let used = {};
//   for (let i = 0; i < k; ) {
//     let ind = Math.floor(Math.random() * S.length);
//     if (used[ind]) continue;
//     samples.push(S[ind]);
//     used[ind] = true;
//     i++;
//   }
//   return samples;

import { colorDistance } from "./img";

// };
export type Color = [number, number, number, number];
let random_sample = (S: Color[], k: number) => {
  S = S.slice();
  for (let i = 0; i < S.length; i++) {
    let to = i + Math.floor(Math.random() * (S.length - i));
    let tmp = S[to];
    S[to] = S[i];
    S[i] = tmp;
  }
  return S.slice(0, k);
};

let random_ds = (k: number, n: number, max: number) => {
  let res = [];
  for (let i = 0; i < k; i++) {
    let tmp = [];
    for (let j = 0; j < n; j++) tmp.push(Math.floor(Math.random() * max));
    res.push(tmp);
  }
  return res;
};

let dist2 = (a: Color, b: Color) => {
  return colorDistance(a, b);
    let dist = 0;
    for (let i = 0; i < a.length; i++) {
      dist = dist + (b[i] - a[i]) * (b[i] - a[i]);
    }
    return dist;
};
export let find_closest = (v: Color, means: Color[]) => {
  let best = {
    dist: dist2(v, means[0]),
    ind: 0,
  };
  for (let i = 0; i < means.length; i++) {
    let dist = dist2(v, means[i]);
    if (dist < best.dist) best = { dist, ind: i };
  }
  return best.ind;
};

let average = (V: Color[]): Color => {
  let N = V.length;
  let res: Color = V[0].slice(0) as Color;
  for (let j = 0; j < res.length; j++) {
    for (let i = 1; i < N; i++) {
      res[j] += V[i][j];
    }
    res[j] = Math.round(res[j] / N);
  }
  return res;
};

let eq = (a: Color, b: Color) => {
  return a.every((ent, i) => ent == b[i]);
};

let find_unique = (S: Color[]) => {
  let used: Record<string, boolean> = {};
  let unique = [];
  for (let i = 0; i < S.length; i++) {
    if (used[S[i].toString()]) continue;
    unique.push(S[i]);
    used[S[i].toString()] = true;
  }
  return unique;
};

interface KMeansArgs {
  iterations?: number;
}
//returns k means from S
export let kmeans = (S: Color[], k: number, args: KMeansArgs = {}) => {
  let unique = find_unique(S);
  let iterations = args?.iterations ?? 250;

  if (unique.length <= k) {
    while (unique.length < k) unique.push(unique[0]);
    // console.log("few unique");
    return unique;
  }
  let means = random_sample(unique, k);
  for (let i = 0; i < iterations; i++) {
    let identical_count = 0;
    let clusters: Color[][] = [...Array(k)].map((_) => []);
    for (let j = 0; j < S.length; j++) {
      let closest = find_closest(S[j], means);
      clusters[closest].push(S[j]);
    }
    for (let j = 0; j < k; j++) {
      if (clusters[j].length > 0) {
        let new_mean = average(clusters[j]);
        identical_count += eq(new_mean, means[j]) ? 1 : 0;
        means[j] = new_mean;
      }
    }
    if (identical_count == k) {
      // console.log(`Quit at ${i}`);
      break;
    }
  }
  return means;
};

// if (require.main === module) {
//   for (let i = 0; i < 1000; i++) {
//     console.log(i);
//     let points = random_ds(256 * 256, 4, 256);
//     //   console.log(points);
//     kmeans(points, 8);
//   }
// }

// module.exports = {
//   kmeans,
//   find_closest,
//   find_unique,
// };
