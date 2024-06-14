let notes = [];

const pointerPosition = { x: 0, y: 0, };

let activeNoteId;

document.addEventListener('DOMContentLoaded', (event) => {
  document.addEventListener('mousedown', handleDocumentClick);
  document.addEventListener('touchstart', handleDocumentClick);
  document.addEventListener('contextmenu', showContextMenu);
  document.addEventListener('mouseup', showContextMenu);
  document.addEventListener('click', (e) => { e.preventDefault(); })
  document.addEventListener('touchend', showContextMenu);
  document.addEventListener('mousemove', (e) => {
    pointerPosition.x = e.clientX;
    pointerPosition.y = e.clientY;
  });

  // notes = JSON.parse(localStorage?.getItem('notes') || '[]');

  if (!notes) {
    notes = [];
    // localStorage.setItem('notes', JSON.stringify(notes));
  }
});

function handleDocumentClick(event) {
  const menu = document.getElementById('context-menu');
  if (!menu.contains(event.target) && window.getSelection().toString().trim() === '') {
    hideContextMenu();
  }
}

function handleComment(event) {
  const selection = window.getSelection();
  const selectionId = document.getElementById('context-menu').getAttribute('selection-range');

  hideContextMenu();

  const note = document.getElementById('note-container');
  const menuWidth = Number(note.offsetWidth);
  const menuHeight = Number(note.offsetHeight);

  note.style.display = "flex";
  note.style.top = `${pointerPosition.y - menuHeight * 1.25}px`;
  note.style.right = `${window.innerWidth * 0.5 + menuWidth / 2}px`;

  if (selection.toString().trim().length) {
    highlightSelection("note");

    const range = selection.getRangeAt(0);
    const startId = range.startContainer.getAttribute('qaree-src-id');
    const endId = range.startContainer.getAttribute('qaree-src-id');
    const rangeId = `${startId}_${range.startOffset}-${endId}_${range.endOffset}`

    activeNoteId = rangeId;

    note.setAttribute('note-id', rangeId);
    const noteInput = document.querySelector('textarea');
    noteInput.value = "";
  } else {
    activeNoteId = selectionId;

    note.setAttribute('note-id', selectionId);
    const noteData = notes.find(r => r.id === selectionId)
    if (noteData) {
      const noteInput = document.querySelector('textarea');
      noteInput.value = noteData.noteInput;
    }
  }

  const menu = document.getElementById('context-menu');
  menu.style.display = "none";
}

function handleCancelComment(event) {
  const note = document.getElementById('note-container');
  note.style.display = "none";

  const noteValue = document.querySelector('textarea');

  if (!noteValue.value) {
    removeHighlighted(activeNoteId);
    notes = notes.filter(note => note.id !== activeNoteId);
    // localStorage.setItem('notes', JSON.stringify(notes));
  }
}

function handleSaveComment(event) {
  const note = document.getElementById('note-container');
  const noteValue = document.querySelector('textarea');
  const noteId = note.getAttribute('note-id');

  if (noteValue.value) {
    const noteData = notes.find(note => note.id === noteId);
    if (noteData) {
      noteData.note = noteValue.value;
      noteValue.value = "";
    } else if (noteId) {
      const [[startId, startIdx], [endId, endIdx]] = noteId.split('-').map(e => e.split('_'));

      notes.push({
        id: noteId,
        start: {
          id: startId,
          idx: startIdx
        },
        end: {
          id: endId,
          idx: endIdx
        },
        note: noteValue.value
      });
    }

    // localStorage.setItem('notes', JSON.stringify(notes));
  } else {
    removeHighlighted(noteId);
    notes = notes.filter(note => note.id !== noteId);
    // localStorage.setItem('notes', JSON.stringify(notes));
  }

  note.style.display = "none";
}

function highlightSelection(type = "highlight") {
  const selection = window.getSelection();
  const menu = document.getElementById('context-menu');
  hideContextMenu();
  if (selection.rangeCount > 0 && selection.toString().trim().length > 0) {
    const range = selection.getRangeAt(0);
    highlightRange(range, type);
    const startId = range.startContainer.getAttribute('qaree-src-id');
    const endId = range.startContainer.getAttribute('qaree-src-id');
    const rangeId = `${startId}_${range.startOffset}-${endId}_${range.endOffset}`

    if (type === 'note' && rangeId !== activeNoteId)
      activeNoteId = rangeId;

    selection.empty();
    if (
      !notes?.find(e => e.id === rangeId) &&
      (startId !== null || endId !== null) &&
      window.getSelection().toString().trim().length > 0
    ) {
      notes.push({
        id: rangeId,
        start: {
          id: startId,
          idx: range.startOffset
        },
        end: {
          id: endId,
          idx: range.endOffset
        },
        note: "",
      });
      // localStorage.setItem('notes', JSON.stringify(notes));
      return rangeId;
    }
  } else {
    const selectionId = menu.getAttribute('selection-range');
    if (selectionId) {
      removeHighlighted(selectionId);
      notes = notes?.filter(note => note.id !== selectionId);
      // localStorage.setItem('notes', notes);
    }
  }
}

function highlightRange(range, type) {
  const startContainer = range.startContainer;
  const endContainer = range.endContainer;
  const startId = startContainer.parentNode.getAttribute('qaree-src-id');
  const endId = endContainer.parentNode.getAttribute('qaree-src-id');

  const rangeId = `${startId}_${range.startOffset}-${endId}_${range.endOffset}`;

  const menu = document.getElementById('context-menu');
  menu.setAttribute('selection-range', rangeId);

  if (startContainer === endContainer && startContainer.nodeType === Node.TEXT_NODE) {
    wrapTextNodeWithMark(startContainer, range.startOffset, range.endOffset, rangeId, type);

    return;
  }

  const startNode = splitTextNode(startContainer, range.startOffset, true);
  const endNode = splitTextNode(endContainer, range.endOffset, false);

  wrapRangeWithMark(startNode, endNode, rangeId, type);
}

function splitTextNode(node, offset, isStart) {
  if (node.nodeType !== Node.TEXT_NODE) {
    return node;
  }
  const text = node.textContent;
  const parentNode = node.parentNode;
  const beforeText = text.slice(0, offset);
  const afterText = text.slice(offset);
  const beforeNode = document.createTextNode(beforeText);
  const afterNode = document.createTextNode(afterText);

  parentNode.insertBefore(beforeNode, node);
  parentNode.insertBefore(afterNode, node);
  parentNode.removeChild(node);

  return isStart ? afterNode : beforeNode;
}

function wrapTextNodeWithMark(node, startOffset, endOffset, range, type) {
  const text = node.textContent;
  const parentNode = node.parentNode;
  const beforeText = text.slice(0, startOffset);
  const middleText = text.slice(startOffset, endOffset);
  const afterText = text.slice(endOffset);

  const beforeNode = document.createTextNode(beforeText);
  const middleNode = document.createTextNode(middleText);
  const afterNode = document.createTextNode(afterText);

  const markElement = document.createElement('mark');
  markElement.classList.add(type);
  markElement.setAttribute('range-id', range);
  markElement.appendChild(middleNode);

  parentNode.insertBefore(beforeNode, node);
  parentNode.insertBefore(markElement, node);
  parentNode.insertBefore(afterNode, node);
  parentNode.removeChild(node);

  handleMarkElementMouseEvents(markElement, range);
}

function wrapRangeWithMark(startNode, endNode, range, type) {
  let node = startNode;
  const nodesToWrap = [];

  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const parentNode = node.parentNode;
      const markElement = document.createElement('mark');
      markElement.classList.add(type);
      markElement.setAttribute('range-id', range);

      parentNode.insertBefore(markElement, node);
      markElement.appendChild(node);

      handleMarkElementMouseEvents(markElement, range);

      nodesToWrap.push(markElement);
    } else {
      nodesToWrap.push(node);
    }

    if (node === endNode) {
      break;
    }

    node = getNextNode(node);
  }

  nodesToWrap.forEach(node => {
    if (node.nodeType !== Node.TEXT_NODE) {
      const markElement = document.createElement('mark');
      markElement.classList.add(type);
      markElement.setAttribute('range-id', range);
      while (node.firstChild) {
        markElement.appendChild(node.firstChild);

        handleMarkElementMouseEvents(markElement, range);
      }
      node.appendChild(markElement);
    }
  });
}

function wrapElementNodeWithMark(node, endNode, range, type) {
  const markElement = document.createElement('mark');
  markElement.classList.add(type);
  markElement.setAttribute('range-id', range);

  node.parentNode.insertBefore(markElement, node);

  while (node && node !== endNode) {
    const nextNode = getNextNode(node, endNode);
    markElement.appendChild(node);
    node = nextNode;
  }

  if (node === endNode) {
    markElement.appendChild(node);
  }

  handleMarkElementMouseEvents(markElement, range);

  return markElement;
}

function handleMarkElementMouseEvents(markElement, range) {
  function removeContextMenu(e) {
    // Check if mouse is outside the markElement (left or right)
    const rect = e.target.getBoundingClientRect();
    const menu = document.querySelector('#context-menu');
    if (e.clientX < rect.left || e.clientX > rect.right) {
      if (e.clientY < rect.top && e.clientY > rect.top + menu.offsetHeight) {
        hideContextMenu();
      }
    }
  }

  markElement.addEventListener('mouseenter', (e) => showContextMenuOnHover(e, range));
  markElement.addEventListener('touchmove', (e) => showContextMenuOnHover(e, range));
  markElement.addEventListener('mouseleave', removeContextMenu);
  markElement.addEventListener('touchend', removeContextMenu);
}

function getNextNode(node, endNode) {
  if (node.firstChild) {
    return node.firstChild;
  }
  while (node) {
    if (node === endNode) {
      return null;
    }
    if (node.nextSibling) {
      return node.nextSibling;
    }
    node = node.parentNode;
  }
  return null;
}

function removeHighlighted(rangeId) {
  const highlightedElements = document.querySelectorAll(`[range-id="${rangeId}"]`);

  highlightedElements.forEach(markElement => {
    // Get the child node(s) containing the highlighted content
    const content = markElement.firstChild;

    // Check if there are multiple child nodes (edge case)
    while (content && content.nextSibling) {
      content.appendChild(content.nextSibling);
    }

    // Replace the mark element with its child node(s)
    markElement?.parentNode?.replaceChild(content, markElement);
  });

  hideContextMenu();
}

function showContextMenu(event) {
  if (event.type === "contextmenu") {
    event.preventDefault();
  }
  setTimeout(() => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0 && selection.toString().trim().length) {
      const x = event.pageX;
      const y = event.pageY;

      const menu = document.getElementById('context-menu');
      const menuWidth = Number(menu.offsetWidth);
      const menuHeight = Number(menu.offsetHeight);

      menu.style.top = `${y - menuHeight * 1.25}px`;
      menu.style.left = `${x - menuWidth * 0.5}px`;
      menu.style.display = 'block';
    }
  }, 0);
}

function showContextMenuOnHover(event, range) {
  const menu = document.getElementById('context-menu');
  const rect = event.target.parentNode.getBoundingClientRect();

  menu.style.top = `${event.pageY}px`;
  menu.style.left = `${event.pageX}px`;
  menu.style.display = 'block';
  menu.setAttribute('selection-range', range);

  menu.addEventListener('mouseleave', hideContextMenu);
}

function hideContextMenu() {
  const menu = document.getElementById('context-menu');
  menu.style.display = 'none';
}

document.addEventListener('mouseover', (e) => {
  const menu = document.querySelector('#context-menu');
  if (window.getComputedStyle(menu, 'display') !== 'none' && menu.getAttribute('range-id')) {
    menu.style.left = `${e.clientX - menu.offsetWidth / 2}px`;
    menu.addEventListener('mouseleave', hideContextMenu);
  }
});
