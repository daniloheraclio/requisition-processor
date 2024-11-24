<template>
  <div class="p-4 mx-auto space-y-4 absolute">
    <Card>
      <CardHeader>
        <CardTitle>CCAC Requisition JSON Transformer</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-2">
          <div class="flex items-start justify-start w-full gap-4">
            <!-- INPUT COLUMN -->
            <div class="space-y-4 w-full max-w-[720px] min-w-[720px]">
              <div class="flex justify-between items-center">
                <Label>Paste the requisition request JSON</Label>
                <Button @click="formatJson" size="sm">Format JSON</Button>
              </div>
              <div
                class="relative h-full overflow-auto bg-slate-50 border border-slate-300 rounded-lg py-2"
              >
                <div class="flex">
                  <!-- Line Numbers -->
                  <div
                    class="bg-slate-100 text-slate-500 font-mono text-sm text-right select-none w-12 flex-shrink-0"
                  >
                    <pre class="line-numbers">{{
                      getLineNumbers(sourceJson)
                    }}</pre>
                  </div>
                  <!-- Textarea -->
                  <div class="w-full overflow-hidden">
                    <textarea
                      v-model="sourceJson"
                      placeholder="Paste your JSON here..."
                      class="font-mono text-sm pl-3 flex-grow bg-transparent resize-none w-full min-h-32 focus:outline-none"
                      spellcheck="false"
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>
            <Alert v-if="error" variant="destructive">
              <AlertDescription>{{ error }}</AlertDescription>
            </Alert>

            <!-- ITEM OPTIONS -->
            <div v-if="items.length" class="space-y-4 min-w-96 max-w-96">
              <div class="flex justify-between items-center">
                <h3 class="text-lg font-semibold">
                  Items Configuration ({{ items.length }})
                </h3>
                <Button @click="generateResultJson">Generate Result</Button>
              </div>

              <div v-for="(item, index) in items" :key="index">
                <Card>
                  <CardContent class="pt-4 space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                      <div class="flex items-start space-x-4">
                        <!-- Select item status -->
                        <div class="flex-1">
                          <Label>Status</Label>
                          <Select
                            v-model="item.status"
                            @update:value="
                              (value: string) =>
                                handleItemUpdate(index, 'status', value)
                            "
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="APPROVED">Approved</SelectItem>
                              <SelectItem value="DENIED">Denied</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <!-- If its a replacement -->
                        <div
                          v-if="item.status === 'APPROVED'"
                          class="flex items-center pt-8 space-x-2"
                        >
                          <Switch
                            v-model="item.isReplacement"
                            @update:checked="
                              checked =>
                                handleItemUpdate(
                                  index,
                                  'isReplacement',
                                  checked,
                                )
                            "
                          />
                          <Label>Replacement</Label>
                        </div>
                      </div>
                    </div>
                    <div class="flex flex-col gap-4">
                      <Input
                        v-if="item.status === 'APPROVED'"
                        placeholder="Master Item Description"
                        v-model="item.masterItemDesc"
                      />
                      <Input
                        v-if="item.status === 'APPROVED'"
                        placeholder="Master Item Code"
                        v-model="item.masterItemCode"
                      />

                      <Input
                        v-if="item.status === 'DENIED'"
                        placeholder="Denial Reason"
                        v-model="item.denialReason"
                      />
                      <Input
                        v-if="item.status === 'DENIED'"
                        placeholder="Denial Reason Code"
                        v-model="item.denialReasonCode"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
              <Button @click="addNewItem" size="sm">
                <Plus class="w-4 h-4 mr-2" />
                Add New Item
              </Button>
            </div>

            <!-- RESULT COLUMN -->
            <div v-if="result" class="space-y-2">
              <div class="flex justify-between items-center">
                <h3 class="text-lg font-semibold">Result</h3>
                <Button @click="copyToClipboard">Copy to Clipboard</Button>
              </div>
              <pre class="bg-slate-100 p-4 rounded-lg overflow-auto">
            {{ result }}
          </pre
              >
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Plus } from 'lucide-vue-next'
import { v4 as uuidv4 } from 'uuid'

// REQUEST TYPES
type Address = {
  postal_code: string
  street_name: string
  city: string
  street_number: string
  province: string
  country: string
}

type Reception = {
  type: string
  receive_at: string // ISO 8601 date string
  instructions: string
  address: Address
}

type ItemRequest = {
  external_reference_number: string
  quantity: number
  additional_information: string
  master_item_guid: string
  external_system_id: string
}

type ExtendedItemRequest = ItemRequest & {
  status: 'APPROVED' | 'DENIED'
  isReplacement: boolean
  masterItemDesc: string
  masterItemCode: string
  denialReason?: string // Optional if not always used
  denialReasonCode?: string // Optional if not always used
}

type Requisition = {
  external_reference_number: string
  items: ItemRequest[]
  reception: Reception
  external_requisition_date: string // ISO 8601 date string
  external_system_id: string
}

type Owner = {
  type: string
  name: string
  code: string
}

type Destination = {
  type: string
  name: string
  code: string
  owner: Owner
}

type Sender = {
  type: string
  name: string
  code: string
  owner: Owner
}

type Provider = {
  name: string
  number: string
}

type Root = {
  requisition: Requisition
  billing_reference_number: string
  service_assignment_id: string
  message_tracking_id: string
  destination: Destination
  submitted_by_staff_name: string
  provider: Provider
  sender: Sender
}

// RESPONSE TYPES

type RequisitionHeader = {
  ExternalSystemId: string
  ExternalReferenceNumber: string
  RequisitionGuid: string
  RequisitionNumber: string
  RequisitionStatusCode: 'APPROVED' | 'DENIED'
  RequisitionStatus: string
  ApprovedByStaffName: string
  ApprovedDate: string // ISO 8601 date string
}

type EquipmentAndSuppliesRequisition = {
  RequisitionHeader: RequisitionHeader
  LineItem: ItemResponse[]
}

type ItemResponse = {
  ExternalReferenceNumber: string
  MasterItemGuid: string
  MasterItemCode: string
  MasterItemDesc: string
  LineItemGuid: string
  LineItemNumber: string
  ItemTypeCode: string
  ItemType: string
  ItemUnit: string
  Quantity: string
  AdditionalInformation: string
  LineItemStatusCode: string
  LineItemStatus: string
  DenialReasonCode?: string
  DenialReason?: string
}

type EquipmentAndSuppliesRequisitionResponse = {
  Sender: Destination // Assume `Destination` is already defined in your codebase
  MessageTrackingID: string
  ServiceAssignmentId: string
  EquipmentAndSuppliesRequisition: EquipmentAndSuppliesRequisition
  Destination: Sender // Assume `Sender` is already defined in your codebase
}

type Payload = {
  EquipmentAndSuppliesRequisitionResponse: EquipmentAndSuppliesRequisitionResponse
}

const sourceJson = ref('')
const parsedRequest = ref<Root | null>(null)
const error = ref('')
const items = ref<ExtendedItemRequest[]>([])
const result = ref('')

const formatJson = () => {
  try {
    const formatted = JSON.stringify(JSON.parse(sourceJson.value), null, 2)
    sourceJson.value = formatted
    validateAndParseJson(formatted)
  } catch (e) {
    error.value = 'Invalid JSON format: ' + (e as Error).message
  }
}

const validateAndParseJson = (jsonString: string) => {
  try {
    const parsed = JSON.parse(jsonString)
    if (!parsed.requisition?.items) {
      throw new Error('Invalid JSON structure: missing requisition.items')
    }
    parsedRequest.value = parsed
    items.value = parsed.requisition.items.map((item: ItemRequest) => ({
      ...item,
      status: 'APPROVED',
      isReplacement: false,
      masterItemDesc: '',
      masterItemCode: '',
      denialReason: '',
      denialReasonCode: '',
    }))
    error.value = ''
  } catch (e) {
    error.value = 'Invalid JSON format: ' + (e as Error).message
    parsedRequest.value = null
    items.value = []
  }
}

watch(sourceJson, newVal => {
  if (newVal) {
    console.log('New JSON:', typeof newVal)
    validateAndParseJson(newVal)
  }
})

const addNewItem = () => {
  const newItem: ExtendedItemRequest = {
    quantity: 1,
    master_item_guid: uuidv4(),
    external_system_id: uuidv4(),
    additional_information: '',
    external_reference_number: '',
    status: 'APPROVED',
    isReplacement: false,
    masterItemDesc: '',
    masterItemCode: '',
    // denialReason: '', // If the requisition is denied. Always Approved for now
    // denialReasonCode: '', // If the requisition is denied. Always Approved for now
  }
  items.value.push(newItem)
}

const handleItemUpdate = (
  index: number,
  field: string,
  value: boolean | string,
) => {
  items.value[index] = { ...items.value[index], [field]: value }
}

const generateResultJson = () => {
  if (!parsedRequest.value) return

  const resultPayload = {
    payload: {
      EquipmentAndSuppliesRequisitionResponse: {
        Sender: parsedRequest.value.destination,
        MessageTrackingID: uuidv4(),
        ServiceAssignmentId: parsedRequest.value.service_assignment_id,
        EquipmentAndSuppliesRequisition: {
          RequisitionHeader: {
            ExternalSystemId:
              parsedRequest.value.requisition.external_system_id,
            ExternalReferenceNumber:
              parsedRequest.value.requisition.external_reference_number,
            RequisitionGuid: uuidv4(),
            RequisitionNumber: '10795203',
            RequisitionStatusCode: 'APPROVED',
            RequisitionStatus: 'Approved',
            ApprovedByStaffName: 'System Generated',
            ApprovedDate: new Date().toISOString(),
          },
          LineItem: items.value.map(
            (item: ExtendedItemRequest): ItemResponse => ({
              ExternalReferenceNumber: item.external_reference_number,
              MasterItemGuid: item.isReplacement
                ? uuidv4()
                : item.master_item_guid,
              MasterItemCode: item.masterItemCode || 'Default Code',
              MasterItemDesc: item.masterItemDesc || 'Default Description',
              LineItemGuid: uuidv4(),
              LineItemNumber: '13737880',
              ItemTypeCode: 'XD',
              ItemType: 'Default Type',
              ItemUnit: 'unit',
              Quantity: item.quantity.toString(),
              AdditionalInformation: item.additional_information,
              LineItemStatusCode: item.status,
              LineItemStatus:
                item.status === 'APPROVED' ? 'Approved' : 'Denied',
              ...(item.status === 'DENIED' && {
                DenialReasonCode: item.denialReasonCode,
                DenialReason: item.denialReason,
              }),
            }),
          ),
        },
        Destination: parsedRequest.value.sender,
      },
    } as Payload,
  }
  result.value = JSON.stringify(resultPayload, null, 2)
}

const copyToClipboard = () => {
  navigator.clipboard.writeText(result.value)
}

const getLineNumbers = (text: string) => {
  const lines = text.split('\n').length
  return Array.from({ length: lines }, (_, i) => i + 1).join('\n')
}
</script>

<style scoped>
.line-numbers {
  margin: 0; /* Remove default margin from <pre> */
  padding: 0; /* Align numbers with textarea padding */
  white-space: pre; /* Preserve formatting for line numbers */
  line-height: 1.5;
}

textarea {
  white-space: pre; /* Preserve whitespace formatting */
  line-height: 1.5; /* Ensure consistent line spacing */
  height: 100%; /* Make textarea fill the container vertically */
  width: 100%; /* Ensure textarea takes the remaining horizontal space */
  border: none; /* Remove inner border */
  resize: none; /* Disable manual resizing */
  overflow-y: hidden; /* Enable vertical scrolling */
  overflow-x: auto;
}

.relative {
  font-family: 'Courier New', Courier, monospace; /* IDE-like font */
}
</style>
