import { readFile } from 'node:fs/promises'
import { searchKnowledge } from '../services/knowledgeService.js'
const cases=JSON.parse(await readFile(new URL('../../../knowledge/evaluation-hcmus.json',import.meta.url),'utf8'))
let hit1=0,hit5=0,accepted=0
const matches=(result,item)=>result?.source===item.source&&(!item.titleIncludes||result.title.includes(item.titleIncludes))
for(const item of cases){const results=await searchKnowledge(item.query,5);accepted+=Number(results.length>0);hit1+=Number(matches(results[0],item));hit5+=Number(results.some(x=>matches(x,item)));console.log(`${matches(results[0],item)?'✓':'✗'} ${item.query} → ${results[0]?.source||'none'} > ${results[0]?.title||'none'} (${results[0]?.confidence||0})`)}
const metrics={cases:cases.length,answerRate:accepted/cases.length,recallAt1:hit1/cases.length,recallAt5:hit5/cases.length}
console.log(metrics)
if(metrics.recallAt5<.9||metrics.answerRate<.9)process.exitCode=1
