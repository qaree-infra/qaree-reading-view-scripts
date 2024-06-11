let notes;

document.addEventListener('DOMContentLoaded', (event) => {
  document.addEventListener('mousedown', handleDocumentClick);
  document.addEventListener('mouseup', showContextMenu);
  document.addEventListener('selectionchange', function (event) {
    showContextMenu(event);
  });

  notes = JSON.parse(localStorage?.getItem('notes') || JSON.stringify([]));

  if (!notes) {
    notes = [];
    localStorage.setItem('notes', JSON.stringify(notes));
  }
});

function handleDocumentClick(event) {
  const menu = document.getElementById('context-menu');
  if (!menu.contains(event.target) && window.getSelection().toString().trim() === '') {
    hideContextMenu();
  }
}

function handleComment(event) {
  const selectionId = document.getElementById('context-menu').getAttribute('selection-range');

  if (!selectionId) {
    const rangeId = highlightSelection();
    const note = document.getElementById('note-container');
    note.style.display = "flex";
    note.setAttribute('note-id', rangeId);
    const noteInput = document.querySelector('textarea');
    noteInput.value = "";
  } else {
    const note = document.getElementById('note-container');
    note.style.display = "flex";
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
  const noteId = note.getAttribute('note-id');

  if (!noteValue.value) {
    removeHighlighted(noteId);
    notes = notes.filter(note => note.id !== noteId);
    console.log(notes);
    localStorage.setItem('notes', JSON.stringify(notes));
  }
}

function handleSaveComment(event) {
  const note = document.getElementById('note-container');
  const noteValue = document.querySelector('textarea');
  const noteId = note.getAttribute('note-id');

  if (noteValue.value) {
    const noteData = notes.find(note => note.id === noteId);
    console.log(noteData);
    if (noteData) {
      noteData.note = noteValue.value;
      noteValue.value = "";
    }

    localStorage.setItem('notes', JSON.stringify(notes));
  } else {
    removeHighlighted(noteId);
    notes = notes.filter(note => note.id !== noteId);
    localStorage.setItem('notes', JSON.stringify(notes));
  }

  note.style.display = "none";
}

function highlightSelection() {
  const selection = window.getSelection();
  const menu = document.getElementById('context-menu');
  if (selection.rangeCount > 0 && selection.toString().trim().length > 0) {
    const range = selection.getRangeAt(0);
    highlightRange(range);
    const startId = range.startContainer.getAttribute('qaree-src-id');
    const endId = range.startContainer.getAttribute('qaree-src-id');
    const rangeId = `${startId}_${range.startOffset}-${endId}_${range.endOffset}`
    // restoreSelection(range);
    if (!notes.find(e => e.id === rangeId) && (startId !== null || endId !== null) && window.getSelection().toString().trim().length > 0) {
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
      localStorage.setItem('notes', JSON.stringify(notes));
      return rangeId;
    }
  } else {
    console.log(menu);
    const selectionId = menu.getAttribute('selection-range');
    console.log(selectionId);
    if (selectionId) {
      removeHighlighted(selectionId);
      notes = notes.filter(note => note.id !== selectionId);
      localStorage.setItem('notes', notes);
    }
  }
}

function highlightRange(range) {
  const startContainer = range.startContainer;
  const endContainer = range.endContainer;
  const startId = startContainer.parentNode.getAttribute('qaree-src-id');
  const endId = endContainer.parentNode.getAttribute('qaree-src-id');

  const rangeId = `${startId}_${range.startOffset}-${endId}_${range.endOffset}`;

  const menu = document.getElementById('context-menu');
  menu.setAttribute('selection-range', rangeId);

  if (startContainer === endContainer && startContainer.nodeType === Node.TEXT_NODE) {
    wrapTextNodeWithMark(startContainer, range.startOffset, range.endOffset, rangeId);

    return;
  }

  const startNode = splitTextNode(startContainer, range.startOffset, true);
  const endNode = splitTextNode(endContainer, range.endOffset, false);

  wrapRangeWithMark(startNode, endNode, rangeId);
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

function wrapTextNodeWithMark(node, startOffset, endOffset, range) {
  const text = node.textContent;
  const parentNode = node.parentNode;
  const beforeText = text.slice(0, startOffset);
  const middleText = text.slice(startOffset, endOffset);
  const afterText = text.slice(endOffset);

  const beforeNode = document.createTextNode(beforeText);
  const middleNode = document.createTextNode(middleText);
  const afterNode = document.createTextNode(afterText);

  const markElement = document.createElement('mark');
  markElement.setAttribute('range-id', range);
  markElement.appendChild(middleNode);

  parentNode.insertBefore(beforeNode, node);
  parentNode.insertBefore(markElement, node);
  parentNode.insertBefore(afterNode, node);
  parentNode.removeChild(node);

  handleMarkElementMouseEvents(markElement, range);
}

function wrapRangeWithMark(startNode, endNode, range) {
  let node = startNode;
  const nodesToWrap = [];

  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const parentNode = node.parentNode;
      const markElement = document.createElement('mark');
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
      markElement.setAttribute('range-id', range);
      while (node.firstChild) {
        // console.log(node.firstChild);
        markElement.appendChild(node.firstChild);

        handleMarkElementMouseEvents(markElement, range);
      }
      node.appendChild(markElement);
    }
  });
}

function wrapElementNodeWithMark(node, endNode, range) {
  const markElement = document.createElement('mark');
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
  markElement.addEventListener('mouseenter', (e) => showContextMenuOnHover(e, range));
  markElement.addEventListener('mouseleave', (e) => {
    // Check if mouse is outside the markElement (left or right)
    const rect = e.target.getBoundingClientRect();
    const menu = document.querySelector('#context-menu');
    // console.log("top: ", rect.top);
    // console.log('clientY: ', e.clientY);
    if (e.clientX < rect.left || e.clientX > rect.right) {
      if (e.clientY < rect.top && e.clientY > rect.top + menu.offsetHeight) {
        hideContextMenu();
      }
    }
  });

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
    markElement.parentNode.replaceChild(content, markElement);
  });

  hideContextMenu();
}

function getElementPosition(element) {
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX
  };
}

function showContextMenu(event) {
  const selection = window.getSelection();
  if (selection.rangeCount > 0 && selection.toString().trim() !== '') {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const menu = document.getElementById('context-menu');

    const menuPosition = {
      top: rect.top + window.scrollY - menu.offsetHeight - 10,
      left: (rect.left + rect.right) / 2 + window.scrollX
    };
    menu.style.top = `${menuPosition.top}px`;
    menu.style.left = `${menuPosition.left}px`;
    menu.style.display = 'block';
    // console.log(menu);

    event.preventDefault();
  }
}

function showContextMenuOnHover(event, range) {
  const menu = document.getElementById('context-menu');
  const rect = event.target.parentNode.getBoundingClientRect();

  const menuPosition = {
    top: rect.top + window.scrollY - menu.offsetHeight - 10,
    left: event.clientX - menu.offsetWidth / 2
  };
  menu.style.top = `${menuPosition.top}px`;
  menu.style.left = `${menuPosition.left}px`;
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
