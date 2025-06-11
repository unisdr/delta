export const initTokenField = (
  initialValue: [] | undefined, // Existing tokenfield data
  input: HTMLInputElement, // Hidden input element
  dataSource: { id: number; name: string }[] | string, // dataSource for dropdown suggestions
  field: any, // Associated field metadata
  handleFieldChange: any
) => {
// Initial fetch function to populate fetchedData when `dataSource` is a URL
  const fetchInitialData = async () => {
    if (typeof dataSource === 'string') {
      isLoading = true;
      try {
        const response = await fetch(dataSource);
        if (response.ok) {
          fetchedData = await response.json(); // Store fetched data
        } else {
          console.error(`Failed to fetch initial dataSource: ${response.statusText}`);
        }
      } catch (error) {
        console.error('Error fetching initial dataSource:', error);
      } finally {
        isLoading = false;
      }
    }
  };

  

  const wrapper = input.parentElement as HTMLElement;

  if (!wrapper) {
    console.error('Tokenfield initialization failed: No parent element found for input.');
    return;
  }

  input.style.display = 'none';

  // Create or reuse the token container
  let tokenContainer = wrapper.querySelector('.custom-tokenfield-tokens') as HTMLElement;
  if (!tokenContainer) {
    tokenContainer = document.createElement('div');
    tokenContainer.classList.add('custom-tokenfield-tokens');
    Object.assign(tokenContainer.style, {
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'wrap',
      border: '1px solid #ccc',
      padding: '5px',
      borderRadius: '4px',
      position: 'relative',
      gap: '5px',
    });
    wrapper.appendChild(tokenContainer);
  }

  // Editable input for adding tokens
  const editableInput = document.createElement('input');
  editableInput.type = 'text';
  editableInput.classList.add('custom-tokenfield-input');
  Object.assign(editableInput.style, {
    border: 'none',
    outline: 'none',
    flex: '1',
    minWidth: '120px',
    margin: '2px',
  });
  tokenContainer.appendChild(editableInput);

  // Create or reuse the dropdown for suggestions
  let dropdown = tokenContainer.querySelector('.custom-tokenfield-dropdown') as HTMLElement;
  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.classList.add('custom-tokenfield-dropdown');
    Object.assign(dropdown.style, {
      display: 'none',
      position: 'absolute',
      top: 'calc(100% + 4px)',
      left: '0',
      width: '100%',
      maxHeight: '200px',
      overflowY: 'auto',
      background: 'white',
      border: '1px solid #ccc',
      borderRadius: '4px',
      zIndex: '1000',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      padding: '5px',
    });
    tokenContainer.appendChild(dropdown);
  }

  // Initialize selected items from the initial value
  const selectedItems: { id: number; name: string }[] = initialValue ? (initialValue) : [];

  const updateHiddenInput = () => {
    input.value = JSON.stringify(selectedItems);
    handleFieldChange(field, JSON.parse(input.value));
  };

  // Populate initial tokens in the UI
  const renderTokens = () => {
    // Clear all tokens in the UI to avoid duplication
    tokenContainer.querySelectorAll('.custom-token').forEach((token) => token.remove());
  
    // Add tokens from `selectedItems`
    selectedItems.forEach((item) => {
      const token = document.createElement('div');
      token.classList.add('custom-token');
      Object.assign(token.style, {
        display: 'inline-flex',
        alignItems: 'center',
        background: '#f0f0f0',
        color: '#333',
        borderRadius: '4px',
        padding: '4px 8px',
        margin: '2px',
        border: '1px solid #ccc',
      });
      token.textContent = item.name;
  
      const deleteBtn = document.createElement('span');
      deleteBtn.textContent = '×';
      Object.assign(deleteBtn.style, {
        marginLeft: '5px',
        cursor: 'pointer',
        color: 'red',
      });
      deleteBtn.onclick = () => {
        token.remove();
        const index = selectedItems.findIndex((selected) => selected.id === item.id);
        if (index > -1) {
          selectedItems.splice(index, 1);
          updateHiddenInput();
        }
      };
  
      token.appendChild(deleteBtn);
      tokenContainer.insertBefore(token, editableInput);
    });
  
    editableInput.value = ''; // Ensure input is clear
  };
  
  const addToken = (item: { id: number; name: string }, updateInput = true) => {
    // Prevent adding duplicates
    if (!item.name.trim() || selectedItems.some((selected) => selected.id === item.id)) return;
  
    selectedItems.push(item);
  
    if (updateInput) updateHiddenInput();
  
    // Render the new token
    const token = document.createElement('div');
    token.classList.add('custom-token');
    Object.assign(token.style, {
      display: 'inline-flex',
      alignItems: 'center',
      background: '#f0f0f0',
      color: '#333',
      borderRadius: '4px',
      padding: '4px 8px',
      margin: '2px',
      border: '1px solid #ccc',
    });
    token.textContent = item.name;
  
    const deleteBtn = document.createElement('span');
    deleteBtn.textContent = '×';
    Object.assign(deleteBtn.style, {
      marginLeft: '5px',
      cursor: 'pointer',
      color: 'red',
    });
    deleteBtn.onclick = () => {
      token.remove();
      const index = selectedItems.findIndex((selected) => selected.id === item.id);
      if (index > -1) {
        selectedItems.splice(index, 1);
        updateHiddenInput();
      }
    };
  
    token.appendChild(deleteBtn);
    tokenContainer.insertBefore(token, editableInput);
    editableInput.value = ''; // Clear the input
    dropdown.style.display = 'none';
  
    // Re-enable drag-and-drop for all tokens, including the new one
    enableDragAndDrop();
  };
   
  // Dropdown highlight management
  let highlightedIndex = -1;
  const updateDropdownHighlight = () => {
    const options = Array.from(dropdown.querySelectorAll('.custom-tokenfield-dropdown-item')) as HTMLElement[];
    options.forEach((option, index) => {
      Object.assign(option.style, { background: index === highlightedIndex ? '#ddd' : 'white' });
    });
  };

  let fetchedData: { id: number; name: string }[] | null = null; // Cache for AJAX data
  let isLoading = false; // Loading state
  
  const handleInput = async () => {
    const query = editableInput.value.trim().toLowerCase();
    dropdown.innerHTML = '';
    
    if (!query) {
      dropdown.style.display = 'none';
      return;
    }
  
    let suggestions = [];
    
    //console.log('typeof dataSource:', typeof(dataSource));
    //console.log('fetchedData:', fetchedData); 
    //console.log('isLoading:', isLoading);

    // Show loading indicator
    if (typeof dataSource === 'string' && !fetchedData && !isLoading) {
      isLoading = true; // Set loading state
      const loadingMessage = document.createElement('div');
      loadingMessage.textContent = 'Loading data...';
      Object.assign(loadingMessage.style, {
        color: 'gray',
        padding: '8px',
      });
      dropdown.appendChild(loadingMessage);
      dropdown.style.display = 'block'; // Show dropdown with loading message
  
      try {
        const response = await fetch(dataSource);
        if (response.ok) {
          fetchedData = await response.json(); // Assumes response is an array of { id, name }
        } else {
          console.error(`Failed to fetch dataSource: ${response.statusText}`);
        }
      } catch (error) {
        console.error('Error fetching dataSource:', error);
      } finally {
        isLoading = false; // Reset loading state
      }
    }
  
    // Filter the data (either fetched or provided locally)
    if (fetchedData) {
      suggestions = fetchedData.filter((item: any) =>
        item.name.toLowerCase().includes(query) // Matches starting with query
      );
    } else {
      if (!Array.isArray(dataSource)) {
        dataSource = []; // or set it to a default array
      }

      suggestions = dataSource.filter((item: any) =>
        item.name.toLowerCase().includes(query) // Matches starting with query
      );
    }
  
    dropdown.innerHTML = ''; // Clear loading message or previous results
  
    // Render dropdown items
    if (suggestions.length === 0) {
      const noResults = document.createElement('div');
      noResults.textContent = 'No results match';
      Object.assign(noResults.style, {
        color: 'gray',
        padding: '8px',
      });
      dropdown.appendChild(noResults);
    } else {
      suggestions.forEach((item: any) => {
        const isSelected = selectedItems.some((selected) => selected.id === item.id); // Check if the item is selected
        const option = document.createElement('div');
        option.classList.add('custom-tokenfield-dropdown-item');
        option.textContent = item.name;
        Object.assign(option.style, {
          padding: '8px',
          cursor: isSelected ? 'not-allowed' : 'pointer', // Prevent clicking on already selected items
          color: isSelected ? 'gray' : 'black', // Gray font for already selected items
          textDecoration: isSelected ? 'line-through' : 'none', // Optional: Strikethrough for visual distinction
        });
      
        // Add token only if not already selected
        if (!isSelected) {
          option.onclick = () => addToken(item);
        }
      
        dropdown.appendChild(option);
      });
    }
  
    dropdown.style.display = 'block';
    highlightedIndex = -1;
  };  

  editableInput.addEventListener('keydown', (e) => {
    const options = Array.from(dropdown.querySelectorAll('.custom-tokenfield-dropdown-item'));
  
    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && options[highlightedIndex]) {
        const selectedItem = fetchedData ? (fetchedData as { id: number; name: string; }[]).find(
            (item) => item.name === options[highlightedIndex].textContent
          )
        : (dataSource as { id: number; name: string; }[]).find(
            (item) => item.name === options[highlightedIndex].textContent
          );
        if (selectedItem) addToken(selectedItem);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlightedIndex = (highlightedIndex + 1) % options.length;
      updateDropdownHighlight();
  
      // Scroll into view
      if (options[highlightedIndex]) {
        options[highlightedIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightedIndex = (highlightedIndex - 1 + options.length) % options.length;
      updateDropdownHighlight();
  
      // Scroll into view
      if (options[highlightedIndex]) {
        options[highlightedIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  });
  
// Prevent closing dropdown when clicking inside it
dropdown.addEventListener('mousedown', (event) => {
  event.preventDefault(); // Prevents blur event from firing
});

// Modify blur event to allow interactions inside dropdown
editableInput.addEventListener('blur', () => {
  setTimeout(() => {
    if (!dropdown.contains(document.activeElement) && document.activeElement !== editableInput) {
      dropdown.style.display = 'none';
    }
  }, 100); // Small delay to allow focus shift
});

  editableInput.addEventListener('click', () => {
    dropdown.innerHTML = ''; // Clear any previous content
  
    // Get all available items (fetchedData if fetched, otherwise dataSource)
    let suggestions = fetchedData ? fetchedData : dataSource;
  
    // Render all items in the dropdown
    if (!Array.isArray(suggestions)) {
      suggestions = []; // Set default empty array
    }    

    suggestions.forEach((item: any) => {
      const isSelected = selectedItems.some((selected) => selected.id === item.id);
      const option = document.createElement('div');
      option.classList.add('custom-tokenfield-dropdown-item');
      option.textContent = item.name;
      Object.assign(option.style, {
        padding: '8px',
        cursor: isSelected ? 'not-allowed' : 'pointer',
        color: isSelected ? 'gray' : 'black',
        textDecoration: isSelected ? 'line-through' : 'none',
      });
  
      if (!isSelected) {
        option.onclick = () => addToken(item);
      }
  
      dropdown.appendChild(option);
    });
  
    dropdown.style.display = 'block';
  });  

  editableInput.addEventListener('input', handleInput);

  // Add this function inside your initTokenField
  const enableDragAndDrop = () => {
    let draggedIndex: number | null = null;

    // Add drag-related attributes and event listeners to each token
    const updateTokensForDrag = () => {
      const tokens = tokenContainer.querySelectorAll('.custom-token') as NodeListOf<HTMLElement>;
      tokens.forEach((token, index) => {
        token.setAttribute('draggable', "true");

        token.addEventListener('dragstart', () => {
          draggedIndex = index;
          token.style.opacity = '0.5'; // Visual cue for dragging
        });

        token.addEventListener('dragend', () => {
          token.style.opacity = '1'; // Reset visual cue
        });

        token.addEventListener('dragover', (e) => {
          e.preventDefault(); // Necessary to allow dropping
        });

        token.addEventListener('drop', (e) => {
          e.preventDefault();

          if (draggedIndex === null) return;

          // Determine drop target index
          const targetIndex = Array.from(tokens).indexOf(token);

          if (targetIndex !== -1 && draggedIndex !== targetIndex) {
            // Reorder selectedItems array
            const [draggedItem] = selectedItems.splice(draggedIndex, 1);
            selectedItems.splice(targetIndex, 0, draggedItem);

            // Update the hidden input and re-render tokens
            updateHiddenInput();
            renderTokens();

            // Update drag attributes for new order
            updateTokensForDrag();
          }

          draggedIndex = null;
        });
      });
    };

    // Call this function after rendering tokens
    updateTokensForDrag();
  };

  // Call enableDragAndDrop after renderTokens is defined
  renderTokens(); // Initialize with existing tokens
  enableDragAndDrop(); // Enable DnD
  fetchInitialData();

};

export const renderTokenField = (
  field: any,
  fieldId: string,
  value: string | "", // Existing tokenfield data
  tokenfieldRefs: any, // Associated field metadata
  handleFieldChange: any
) => {
  return (
    <textarea
    id={fieldId}
    ref={tokenfieldRefs.current[field.id]}
    value={value}
    onChange={(e) => handleFieldChange(field, e.target.value)}
    style={{display: "none"}}
    ></textarea>
  );
};