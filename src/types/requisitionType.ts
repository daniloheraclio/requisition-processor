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

export type ItemRequest = {
  external_reference_number: string
  quantity: number
  additional_information: string
  master_item_guid: string
  external_system_id: string
}

type itemStatus = 'APPROVED' | 'DENIED'

export type ExtendedItemRequest = ItemRequest & {
  status: itemStatus
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

export type Root = {
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

export type ItemResponse = {
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

export type Payload = {
  EquipmentAndSuppliesRequisitionResponse: EquipmentAndSuppliesRequisitionResponse
}
