import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createBrokerageOutcomeWitnessRecorder, createBrokerageMarketEventRecorder } from "../src/witness.mjs";

test("outcome witness is isolated, append-only, and idempotent at one explicit root", async (t) => {
  const root=mkdtempSync(join(tmpdir(),"brokerage-books-"));t.after(()=>rmSync(root,{recursive:true,force:true}));
  const record=createBrokerageOutcomeWitnessRecorder({BROKERAGE_BOOKS_DATA_ROOT:root},{now:()=> "2096-01-01T00:00:00.000Z"});
  const input={originatingActor:"urn:actor:broker",inputs:[{id:"urn:input:one"}],output:{id:"urn:output:one"},externalEvidence:[{uri:"https://venue.example/receipt",digest:"sha256:one"}]};
  const first=await record(input),second=await record(input);
  assert.equal(first.witness.id,second.witness.id);assert.equal(second.recordReceipt,null);assert.equal(first.witness.originatingActor,"urn:actor:broker");
  const other=createBrokerageOutcomeWitnessRecorder({BROKERAGE_BOOKS_DATA_ROOT:join(root,"other")});const third=await other({...input,observedAt:"2096-01-01T00:00:00.000Z"});assert.equal(third.witness.id,first.witness.id);
});
test("market recorder neither claims self-attestation nor needs RDF authority",async(t)=>{const root=mkdtempSync(join(tmpdir(),"brokerage-books-"));t.after(()=>rmSync(root,{recursive:true,force:true}));const record=createBrokerageMarketEventRecorder({originatingActor:"urn:market:union",nodeId:"union-border"},{BROKERAGE_BOOKS_DATA_ROOT:root},{now:()=> "2096-01-01T00:00:00.000Z"}),value=await record({type:"MarketOffer",attemptedAt:"2096-01-01T00:00:00.000Z"});assert.equal(value.id,value.graph);assert.match(value.recordReceipt.id,/^ni:\/\/\/sha-256;/);});
