import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/PageHeader'
import { AddStudent } from '@/features/students/AddStudent'

export const Route = createFileRoute('/t/students/new')({ component: NewStudent })

function NewStudent() {
  const { t } = useTranslation()
  return (
    <>
      <PageHeader title={t('students.add')} />
      <AddStudent />
    </>
  )
}
