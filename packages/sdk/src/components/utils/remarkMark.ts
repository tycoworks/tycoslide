// remark-mark — ==text== highlight syntax for remark.
// Ported from remark-ins (++text++ → insert) with == delimiters and mark node type.

import { findAfter } from "unist-util-find-after";
import { findAllAfter } from "unist-util-find-all-after";
import { findAllBefore } from "unist-util-find-all-before";
import { findAllBetween } from "unist-util-find-between-all";
import { u } from "unist-builder";
import { visit } from "unist-util-visit";

const REGEX = /==(?![\s=])([\s\S]*?)(?<![\s=])==/;
const REGEX_GLOBAL = /==(?![\s=])([\s\S]*?)(?<![\s=])==/g;
const REGEX_STARTING = /==(?![\s]|==\s)/;
const REGEX_STARTING_GLOBAL = /==(?![\s]|==\s)/g;
const REGEX_ENDING = /(?<!\s|\s=|\s=|\s=|\s=)==/;
const REGEX_ENDING_GLOBAL = /(?<!\s|\s=|\s=|\s=|\s=)==/g;
const REGEX_EMPTY = /==\s*==/;
const REGEX_EMPTY_GLOBAL = /==\s*==/g;

function constructMarkNode(children: any[]) {
  return {
    type: "mark",
    children,
    data: {
      hName: "mark",
      hProperties: {
        className: children.length ? ["remark-mark"] : ["remark-mark-empty"],
      },
    },
  };
}

// Visitor 1: ==text== within a single text node.
const visitorInline = (node: any, index: number | undefined, parent: any) => {
  if (!parent || index === undefined) return;
  if (!REGEX.test(node.value)) return;

  const children: any[] = [];
  const value = node.value;
  let tempValue = "";
  let prevMatchIndex = 0;
  let prevMatchLength = 0;

  const matches = Array.from((value as string).matchAll(REGEX_GLOBAL));
  for (const match of matches) {
    const mIndex = match.index!;
    const mLength = match[0].length;

    const textPartIndex = prevMatchIndex + prevMatchLength;
    prevMatchIndex = mIndex;
    prevMatchLength = mLength;

    if (mIndex > textPartIndex) {
      children.push(u("text", value.substring(textPartIndex, mIndex)));
    }
    children.push(constructMarkNode([{ type: "text", value: match[1].trim() }]));
    tempValue = value.slice(mIndex + mLength);
  }

  if (tempValue) {
    children.push(u("text", tempValue));
  }
  if (children.length) {
    parent.children.splice(index, 1, ...children);
  }
};

// Visitor 2: ==**bold**== spanning across formatted children.
const visitorCrossNode = (node: any, index: number | undefined, parent: any) => {
  if (!parent || index === undefined) return;
  if (!REGEX_STARTING.test(node.value)) return;

  const openingNode = node;
  const closingNode = findAfter(parent, openingNode, (n: any) => {
    return n.type === "text" && REGEX_ENDING.test(n.value);
  });
  if (!closingNode) return;

  const beforeChildren = findAllBefore(parent, openingNode) as any[];
  const mainChildren = findAllBetween(parent, openingNode, closingNode) as any[];
  const afterChildren = findAllAfter(parent, closingNode) as any[];

  // Opening node
  const value = openingNode.value as string;
  const match = Array.from(value.matchAll(REGEX_STARTING_GLOBAL))[0];
  const mLength = match[0].length;
  const mIndex = match.index!;

  if (mIndex > 0) {
    beforeChildren.push(u("text", value.substring(0, mIndex)));
  }
  if (value.length > mIndex + mLength) {
    mainChildren.unshift(u("text", value.slice(mIndex + mLength)));
  }

  // Closing node
  const value_ = (closingNode as any).value as string;
  const match_ = Array.from(value_.matchAll(REGEX_ENDING_GLOBAL))[0];
  const mLength_ = match_[0].length;
  const mIndex_ = match_.index!;

  if (mIndex_ > 0) {
    mainChildren.push(u("text", value_.substring(0, mIndex_)));
  }
  if (value_.length > mIndex_ + mLength_) {
    afterChildren.unshift(u("text", value_.slice(mIndex_ + mLength_)));
  }

  parent.children = [...beforeChildren, constructMarkNode(mainChildren), ...afterChildren];
  return index;
};

// Visitor 3: empty markers (==== or == ==).
const visitorEmpty = (node: any, index: number | undefined, parent: any) => {
  if (!parent || index === undefined) return;
  if (!REGEX_EMPTY.test(node.value)) return;

  const children: any[] = [];
  const value = node.value;
  let tempValue = "";
  let prevMatchIndex = 0;
  let prevMatchLength = 0;

  const matches = Array.from((value as string).matchAll(REGEX_EMPTY_GLOBAL));
  for (const match of matches) {
    const mIndex = match.index!;
    const mLength = match[0].length;

    const textPartIndex = prevMatchIndex + prevMatchLength;
    prevMatchIndex = mIndex;
    prevMatchLength = mLength;

    if (mIndex > textPartIndex) {
      children.push(u("text", value.substring(textPartIndex, mIndex)));
    }
    children.push(constructMarkNode([]));
    tempValue = value.slice(mIndex + mLength);
  }

  if (tempValue) {
    children.push(u("text", tempValue));
  }
  if (children.length) {
    parent.children.splice(index, 1, ...children);
  }
};

export default function remarkMark() {
  return (tree: any) => {
    visit(tree, "text", visitorInline);
    visit(tree, "text", visitorCrossNode);
    visit(tree, "text", visitorEmpty);
  };
}
