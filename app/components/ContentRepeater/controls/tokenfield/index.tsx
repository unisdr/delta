export const initTokenField = (
  initialValue: string | undefined, // Existing tokenfield data
  input: HTMLInputElement, // Hidden input element
  dataSource: { id: number; name: string }[], // dataSource for dropdown suggestions
  field: any, // Associated field metadata
  handleFieldChange: any
) => {
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
  const selectedItems: { id: number; name: string }[] = initialValue ? JSON.parse(initialValue) : [];

  const updateHiddenInput = () => {
    input.value = JSON.stringify(selectedItems);
    handleFieldChange(field, input.value);
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
  
    // Render only the new token
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
  };    

  // Dropdown highlight management
  let highlightedIndex = -1;
  const updateDropdownHighlight = () => {
    const options = Array.from(dropdown.querySelectorAll('.custom-tokenfield-dropdown-item'));
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
      suggestions = fetchedData.filter((item) =>
        item.name.toLowerCase().startsWith(query) // Matches starting with query
      );
    } else {
      suggestions = dataSource.filter((item) =>
        item.name.toLowerCase().startsWith(query) // Matches starting with query
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
      suggestions.forEach((item) => {
        const option = document.createElement('div');
        option.classList.add('custom-tokenfield-dropdown-item');
        option.textContent = item.name;
        Object.assign(option.style, {
          padding: '8px',
          cursor: 'pointer',
        });
        option.onclick = () => addToken(item); // Add token on click
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
        const selectedItem = fetchedData
          ? fetchedData.find((item) => item.name === options[highlightedIndex].textContent)
          : dataSource.find((item) => item.name === options[highlightedIndex].textContent);
        if (selectedItem) addToken(selectedItem);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlightedIndex = (highlightedIndex + 1) % options.length;
      updateDropdownHighlight();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightedIndex = (highlightedIndex - 1 + options.length) % options.length;
      updateDropdownHighlight();
    }
  });  

  editableInput.addEventListener('input', handleInput);

  renderTokens(); // Initialize with existing tokens
};

export const renderTokenField = (
  field: string,
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