import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { ActionBar, Checkbox} from "@chakra-ui/react"
import { useState } from "react"
import { LuShare, LuTrash2 } from "react-icons/lu"

import {
	Badge,
	Combobox,
	Wrap,
	createListCollection,
} from "@chakra-ui/react"

import { useMemo } from "react"

import { MainContainer } from "~/frontend/container";

import { Button, CloseButton, Dialog, Portal } from "@chakra-ui/react"

import { Menu } from "@chakra-ui/react"

import {
  Field,
  Fieldset,
  For,
  Input,
  NativeSelect,
  Stack,
} from "@chakra-ui/react"


export default function Page() {
	return <MainContainer
		title="Chakra UI Examples"
	>
		<p><a href="https://www.chakra-ui.com/docs/components/concepts/overview">Full list of available components</a></p>
		<ChakraProvider value={defaultSystem}>
			<h2 style={{marginTop: "20px"}}>Combobox</h2>
			<DTSCombobox></DTSCombobox>
			<h2 style={{marginTop: "20px"}}>Action bar</h2>
			<DTSActionBar></DTSActionBar>
			<h2 style={{marginTop: "20px"}}>Dialog</h2>
			<DTSDialog></DTSDialog>
			<h2 style={{marginTop: "20px"}}>Menu</h2>
			<DTSMenu></DTSMenu>
			<h2 style={{marginTop: "20px"}}>Field set</h2>
			<DTSFieldSet></DTSFieldSet>
		</ChakraProvider>
	</MainContainer>
}

const skills = [
	"JavaScript",
	"TypeScript",
	"React",
	"Node.js",
	"GraphQL",
	"PostgreSQL",
]

function DTSCombobox() {
	const [searchValue, setSearchValue] = useState("")
	const [selectedSkills, setSelectedSkills] = useState<string[]>([])
	const filteredItems = useMemo(
		() =>
			skills.filter((item) =>
				item.toLowerCase().includes(searchValue.toLowerCase()),
			),
		[searchValue],
	)

	const collection = useMemo(
		() => createListCollection({ items: filteredItems }),
		[filteredItems],
	)

	const handleValueChange = (details: Combobox.ValueChangeDetails) => {
		setSelectedSkills(details.value)
	}

	return (
			<Combobox.Root
				multiple
				closeOnSelect
				width="320px"
				value={selectedSkills}
				collection={collection}
				onValueChange={handleValueChange}
				onInputValueChange={(details) => setSearchValue(details.inputValue)}
			>
				<Wrap gap="2">
					{selectedSkills.map((skill) => (
						<Badge key={skill}>{skill}</Badge>
					))}
				</Wrap>
				<Combobox.Label>Select Skills</Combobox.Label>
				<Combobox.Control>
					<Combobox.Input />
					<Combobox.IndicatorGroup>
						<Combobox.Trigger />
					</Combobox.IndicatorGroup>
				</Combobox.Control>

				<Portal>
					<Combobox.Positioner>
						<Combobox.Content>
							<Combobox.ItemGroup>
								<Combobox.ItemGroupLabel>Skills</Combobox.ItemGroupLabel>
								{filteredItems.map((item) => (
									<Combobox.Item key={item} item={item}>
										{item}
										<Combobox.ItemIndicator />
									</Combobox.Item>
								))}
								<Combobox.Empty>No skills found</Combobox.Empty>
							</Combobox.ItemGroup>
						</Combobox.Content>
					</Combobox.Positioner>
				</Portal>
			</Combobox.Root>
	);
}

function DTSActionBar(){
	const [checked, setChecked] = useState(false)
	return (
		<>
			<Checkbox.Root onCheckedChange={(e) => setChecked(!!e.checked)}>
				<Checkbox.HiddenInput />
				<Checkbox.Control />
				<Checkbox.Label>Show Action bar</Checkbox.Label>
			</Checkbox.Root>
			<ActionBar.Root open={checked}>
				<Portal>
					<ActionBar.Positioner>
						<ActionBar.Content>
							<ActionBar.SelectionTrigger>
								2 selected
							</ActionBar.SelectionTrigger>
							<ActionBar.Separator />
							<Button variant="outline" size="sm">
								<LuTrash2 />
								Delete
							</Button>
							<Button variant="outline" size="sm">
								<LuShare />
								Share
							</Button>
						</ActionBar.Content>
					</ActionBar.Positioner>
				</Portal>
			</ActionBar.Root>
		</>
	)

}


function DTSDialog(){
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant="outline" size="sm">
          Open Dialog
        </Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Dialog Title</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </p>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">Cancel</Button>
              </Dialog.ActionTrigger>
              <Button>Save</Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}


function DTSMenu(){
  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button variant="outline" size="sm">
          Open
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content>
            <Menu.Item value="new-txt">New Text File</Menu.Item>
            <Menu.Item value="new-file">New File...</Menu.Item>
            <Menu.Item value="new-win">New Window</Menu.Item>
            <Menu.Item value="open-file">Open File...</Menu.Item>
            <Menu.Item value="export">Export</Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}


function DTSFieldSet(){
  return (
    <Fieldset.Root size="lg" maxW="md">
      <Stack>
        <Fieldset.Legend>Contact details</Fieldset.Legend>
        <Fieldset.HelperText>
          Please provide your contact details below.
        </Fieldset.HelperText>
      </Stack>

      <Fieldset.Content>
        <Field.Root>
          <Field.Label>Name</Field.Label>
          <Input name="name" />
        </Field.Root>

        <Field.Root>
          <Field.Label>Email address</Field.Label>
          <Input name="email" type="email" />
        </Field.Root>

        <Field.Root>
          <Field.Label>Country</Field.Label>
          <NativeSelect.Root>
            <NativeSelect.Field name="country">
              <For each={["United Kingdom", "Canada", "United States"]}>
                {(item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                )}
              </For>
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Field.Root>
      </Fieldset.Content>

      <Button type="submit" alignSelf="flex-start">
        Submit
      </Button>
    </Fieldset.Root>
  )
}

