(defvar *show-all-constant* 0xFFFFFFFF)

;; Internal function to remove bound nodes and replace them with markers.
;;
;; @param {*} [scope]
;; @param {Node} node
;; @param {Object} def
;; @return {Node}
(defun process-nodes (scope node def)
  (let ((document (if scope (@ scope document) (@ window document)))
        (result (getprop def *template-key*)))
    )
  node)

;; Option to use comment nodes as markers.
(setf (@ process-nodes use-comment-node) f)

;; A crazy Internet Explorer workaround.
(defun accept-node () 1)
(setf (@ accept-node accept-node) accept-node)

;; Avoiding duplication of compatibility hack.
(setf (@ process-nodes accept-node) accept-node)
