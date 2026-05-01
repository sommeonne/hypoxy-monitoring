import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  Table,
  Button,
  Tag,
  Spin,
  Typography,
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  InputNumber,
} from "antd";
import {
  PlayCircleOutlined,
  ArrowRightOutlined,
  EditOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { getGroups } from "../utils/groups";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPatient, updatePatient } from "../api/patients";
import { fetchPatientSessions, startSession, Session } from "../api/sessions";
import PatientInfoCard from "../components/PatientInfoCard";

const { Text } = Typography;

function PatientAvatar({
  firstName,
  lastName,
}: {
  firstName: string;
  lastName: string;
}) {
  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
  return (
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: "50%",
        background: "#E1F5EE",
        color: "#1D9E75",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 20,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>
      {children}
    </span>
  );
}

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  // const [editOpen, setEditOpen] = useState(false);
  const [editForm] = Form.useForm();

  const { data: patient, isLoading: patLoading } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => fetchPatient(id!),
    enabled: !!id,
  });

  const { data: sessions = [], isLoading: sessLoading } = useQuery({
    queryKey: ["patientSessions", id],
    queryFn: () => fetchPatientSessions(id!),
    enabled: !!id,
  });

  const editMutation = useMutation({
    mutationFn: (values: any) =>
      updatePatient(id!, {
        ...values,
        dateOfBirth: values.dateOfBirth.format("YYYY-MM-DD"),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient", id] });
      // setEditOpen(false);
    },
  });

  const startMutation = useMutation({
    mutationFn: () => startSession({ patientId: id! }),
    onSuccess: (session) => {
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["patientSessions", id] });
      navigate(`/sessions/${session.id}`);
    },
  });

  if (patLoading || sessLoading)
    return (
      <Spin size="large" style={{ display: "block", margin: "80px auto" }} />
    );
  if (!patient)
    return (
      <div style={{ padding: 32, color: "#64748B" }}>Patient not found</div>
    );

  const hasActiveSession = sessions.some((s) => s.status === "active");

  const sessionColumns = [
    {
      title: <span className="label-caps">Started</span>,
      dataIndex: "startedAt",
      render: (d: string) => (
        <Text style={{ color: "#374151", fontSize: 13 }}>
          {new Date(d).toLocaleString()}
        </Text>
      ),
    },
    {
      title: <span className="label-caps">Ended</span>,
      dataIndex: "endedAt",
      render: (d: string) =>
        d ? (
          <Text style={{ color: "#374151", fontSize: 13 }}>
            {new Date(d).toLocaleString()}
          </Text>
        ) : (
          <Text style={{ color: "#CBD5E1" }}>—</Text>
        ),
    },
    {
      title: <span className="label-caps">Status</span>,
      dataIndex: "status",
      width: 100,
      render: (s: string) => (
        <Tag
          style={{
            background: s === "active" ? "#E1F5EE" : "#F1F5F9",
            color: s === "active" ? "#1D9E75" : "#64748B",
            border: "none",
            borderRadius: 6,
            fontWeight: 600,
            fontSize: 11,
          }}
        >
          {s.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: <span className="label-caps">Duration</span>,
      width: 100,
      render: (_: any, s: Session) => (
        <Text style={{ color: "#64748B", fontSize: 13 }}>
          {s.summary ? `${s.summary.durationMinutes} min` : "—"}
        </Text>
      ),
    },
    {
      title: "",
      width: 80,
      render: (_: any, s: Session) => (
        <Button
          type="text"
          icon={<ArrowRightOutlined />}
          onClick={() => navigate(`/sessions/${s.id}`)}
          style={{ color: "#1D9E75", fontWeight: 500 }}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      {/* Patient header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <PatientAvatar
            firstName={patient.firstName}
            lastName={patient.lastName}
          />
          <div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "#0F172A",
                margin: "0 0 2px",
              }}
            >
              {patient.firstName} {patient.lastName}
            </h1>
            <Text style={{ color: "#64748B", fontSize: 13 }}>
              {sessions.length} session{sessions.length !== 1 ? "s" : ""}
              {hasActiveSession && (
                <span
                  style={{
                    marginLeft: 8,
                    background: "#E1F5EE",
                    color: "#1D9E75",
                    borderRadius: 20,
                    padding: "1px 8px",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  Active
                </span>
              )}
            </Text>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Button
            icon={<EditOutlined />}
            onClick={() => {
              editForm.setFieldsValue({
                ...patient,
                dateOfBirth: dayjs(patient.dateOfBirth),
              });
              setEditOpen(true);
            }}
            style={{ fontWeight: 600 }}
          >
            Edit
          </Button>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => setModalOpen(true)}
            disabled={hasActiveSession}
            style={{ fontWeight: 600 }}
          >
            Start Session
          </Button>
        </div>
      </div>

      <Modal
        title="Start Session"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => startMutation.mutate()}
        okText="Start"
        confirmLoading={startMutation.isPending}
        okButtonProps={{ icon: <PlayCircleOutlined /> }}
        destroyOnClose
      >
        {/* session settings fields will go here */}
      </Modal>

      <Modal
        title={
          <span style={{ fontWeight: 700, fontSize: 16, color: "#0F172A" }}>
            Edit Patient
          </span>
        }
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={() => editForm.submit()}
        confirmLoading={editMutation.isPending}
        okText="Save"
        okButtonProps={{
          style: {
            background: "#1D9E75",
            borderColor: "#1D9E75",
            fontWeight: 600,
          },
        }}
        destroyOnClose
      >
        <Form
          form={editForm}
          layout="vertical"
          style={{ marginTop: 16 }}
          onFinish={(v) => editMutation.mutate(v)}
          requiredMark={false}
        >
          <Form.Item
            name="cardNumber"
            label={
              <span style={{ fontWeight: 500, fontSize: 13 }}>Card Number</span>
            }
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "0 16px",
            }}
          >
            <Form.Item
              name="lastName"
              label={
                <span style={{ fontWeight: 500, fontSize: 13 }}>Last Name</span>
              }
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="firstName"
              label={
                <span style={{ fontWeight: 500, fontSize: 13 }}>
                  First Name
                </span>
              }
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="patronymic"
              label={
                <span style={{ fontWeight: 500, fontSize: 13 }}>
                  Patronymic
                </span>
              }
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0 16px",
            }}
          >
            <Form.Item
              name="group"
              label={
                <span style={{ fontWeight: 500, fontSize: 13 }}>Group</span>
              }
              rules={[{ required: true }]}
            >
              <Select>
                {getGroups().map((g) => (
                  <Select.Option key={g} value={g}>
                    {g}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="dateOfBirth"
              label={
                <span style={{ fontWeight: 500, fontSize: 13 }}>
                  Date of Birth
                </span>
              }
              rules={[{ required: true }]}
            >
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "0 16px",
            }}
          >
            <Form.Item
              name="height"
              label={
                <span style={{ fontWeight: 500, fontSize: 13 }}>
                  Height (cm)
                </span>
              }
              rules={[{ required: true }]}
            >
              <InputNumber style={{ width: "100%" }} min={0} max={300} />
            </Form.Item>
            <Form.Item
              name="weight"
              label={
                <span style={{ fontWeight: 500, fontSize: 13 }}>
                  Weight (kg)
                </span>
              }
              rules={[{ required: true }]}
            >
              <InputNumber
                style={{ width: "100%" }}
                min={0}
                max={500}
                step={0.1}
              />
            </Form.Item>
            <Form.Item
              name="gender"
              label={
                <span style={{ fontWeight: 500, fontSize: 13 }}>Gender</span>
              }
              rules={[{ required: true }]}
            >
              <Select>
                <Select.Option value="Male">Male</Select.Option>
                <Select.Option value="Female">Female</Select.Option>
              </Select>
            </Form.Item>
          </div>
          <Form.Item
            name="address"
            label={
              <span style={{ fontWeight: 500, fontSize: 13 }}>Address</span>
            }
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0 16px",
            }}
          >
            <Form.Item
              name="phone"
              label={
                <span style={{ fontWeight: 500, fontSize: 13 }}>Phone</span>
              }
              rules={[{ required: true }]}
            >
              <Input placeholder="+38(***) ***-**-**" />
            </Form.Item>
            <Form.Item
              name="email"
              label={
                <span style={{ fontWeight: 500, fontSize: 13 }}>Email</span>
              }
              rules={[
                { required: true },
                { type: "email", message: "Invalid email" },
              ]}
            >
              <Input placeholder="example@email.com" />
            </Form.Item>
          </div>
          <Form.Item
            name="diagnosis"
            label={
              <span style={{ fontWeight: 500, fontSize: 13 }}>Diagnosis</span>
            }
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="notes"
            label={<span style={{ fontWeight: 500, fontSize: 13 }}>Notes</span>}
            rules={[{ required: true }]}
          >
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Patient info */}
      <div style={{ marginBottom: 16 }}>
        <PatientInfoCard
          cardNumber={patient.cardNumber}
          lastName={patient.lastName}
          firstName={patient.firstName}
          patronymic={patient.patronymic}
          dateOfBirth={patient.dateOfBirth}
          gender={patient.gender}
          group={patient.group ?? null}
          height={patient.height ?? null}
          weight={patient.weight ?? null}
          phone={patient.phone}
          email={patient.email}
          address={patient.address}
          diagnosis={patient.diagnosis}
          notes={patient.notes}
        />
      </div>

      {/* Session history */}
      <Card
        title={<SectionTitle>Session History</SectionTitle>}
        style={{
          borderRadius: 12,
          border: "1px solid #E2E8F0",
          boxShadow: "none",
        }}
        styles={{ body: { padding: 20 } }}
      >
        <Table
          dataSource={sessions}
          columns={sessionColumns}
          rowKey="id"
          pagination={{ pageSize: 10, size: "small" }}
          className="teal-table"
          onRow={(s) => ({
            onClick: () => navigate(`/sessions/${s.id}`),
            style: { cursor: "pointer" },
          })}
        />
      </Card>
    </div>
  );
}
