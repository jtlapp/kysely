import { OperationNode } from './operation-node'
import { freeze } from '../util/object-utils'
import { identifierNode, IdentifierNode } from './identifier-node'

export interface DropConstraintNode extends OperationNode {
  readonly kind: 'DropConstraintNode'
  readonly constraintName: IdentifierNode
}

/**
 * @internal
 */
export const dropConstraintNode = freeze({
  is(node: OperationNode): node is DropConstraintNode {
    return node.kind === 'DropConstraintNode'
  },

  create(constraintName: string): DropConstraintNode {
    return freeze({
      kind: 'DropConstraintNode',
      constraintName: identifierNode.create(constraintName),
    })
  },
})