"""
gRPC Service Implementation
"""
import grpc
from typing import Any

from src.services.document_processor import DocumentProcessor
from src.services.requirement_integrator import RequirementIntegrator
from src.services.growth_advisor import GrowthAdvisor
from src.services.experience_service import ExperienceService

# Import generated proto (will be generated at build time)
try:
    from src.proto import document_pb2, document_pb2_grpc
except ImportError:
    document_pb2 = None
    document_pb2_grpc = None


class DocumentServicer:
    """gRPC Document Service Implementation"""

    def __init__(self):
        self.document_processor = DocumentProcessor()
        self.requirement_integrator = RequirementIntegrator()
        self.growth_advisor = GrowthAdvisor()
        self.experience_service = ExperienceService()

    async def ProcessFiles(
        self, request: Any, context: grpc.aio.ServicerContext
    ) -> Any:
        """Process uploaded files"""
        try:
            files = []
            for f in request.files:
                files.append({
                    "name": f.name,
                    "content": f.content,
                    "mime_type": f.mime_type,
                })

            results = await self.document_processor.process_files(
                files, request.user_id
            )

            response = document_pb2.ProcessFilesResponse()
            for result in results:
                processed = document_pb2.ProcessedResult(
                    file_name=result.get("file_name", ""),
                    file_type=result.get("file_type", ""),
                    raw_content=result.get("raw_content", ""),
                    error=result.get("error", ""),
                )
                if result.get("structured"):
                    processed.structured.CopyFrom(
                        self._to_structured_content(result["structured"])
                    )
                response.results.append(processed)

            return response
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return document_pb2.ProcessFilesResponse()

    async def ProcessURL(
        self, request: Any, context: grpc.aio.ServicerContext
    ) -> Any:
        """Process URL"""
        try:
            result = await self.document_processor.process_url(
                request.url, request.user_id
            )

            response = document_pb2.ProcessedResult(
                file_name=result.get("file_name", ""),
                file_type=result.get("file_type", ""),
                raw_content=result.get("raw_content", ""),
                error=result.get("error", ""),
            )
            if result.get("structured"):
                response.structured.CopyFrom(
                    self._to_structured_content(result["structured"])
                )

            return response
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return document_pb2.ProcessedResult()

    async def IntegrateRequirements(
        self, request: Any, context: grpc.aio.ServicerContext
    ) -> Any:
        """Integrate requirements from documents"""
        try:
            documents = []
            for doc in request.documents:
                documents.append({
                    "file_name": doc.file_name,
                    "file_type": doc.file_type,
                    "raw_content": doc.raw_content,
                    "structured": self._from_structured_content(doc.structured),
                })

            result = await self.requirement_integrator.integrate(
                documents,
                request.existing_requirement,
                request.use_ai,
            )

            response = document_pb2.IntegratedRequirement(
                summary=result.get("summary", ""),
            )
            for feature in result.get("features", []):
                response.features.append(document_pb2.FeatureItem(
                    name=feature.get("name", ""),
                    description=feature.get("description", ""),
                    priority=feature.get("priority", "medium"),
                    tags=feature.get("tags", []),
                ))
            response.tech_suggestions.extend(result.get("tech_suggestions", []))
            response.risks.extend(result.get("risks", []))
            response.sources.extend(result.get("sources", []))

            return response
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return document_pb2.IntegratedRequirement()

    async def GenerateGrowthAdvice(
        self, request: Any, context: grpc.aio.ServicerContext
    ) -> Any:
        """Generate growth advice for a project"""
        try:
            advices = await self.growth_advisor.generate_advice(
                request.project_id,
                request.category,
                request.force_refresh,
            )

            response = document_pb2.GrowthAdviceResponse()
            for advice in advices:
                impl = document_pb2.Implementation(
                    type=advice.get("implementation", {}).get("type", ""),
                    estimated_cost=advice.get("implementation", {}).get("estimated_cost", 0),
                    estimated_time=advice.get("implementation", {}).get("estimated_time", ""),
                    difficulty=advice.get("implementation", {}).get("difficulty", ""),
                )
                response.advices.append(document_pb2.GrowthAdvice(
                    id=advice.get("id", ""),
                    type=advice.get("type", ""),
                    priority=advice.get("priority", ""),
                    problem=advice.get("problem", ""),
                    suggestion=advice.get("suggestion", ""),
                    expected_impact=advice.get("expected_impact", ""),
                    metrics=advice.get("metrics", []),
                    implementation=impl,
                ))

            return response
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return document_pb2.GrowthAdviceResponse()

    async def MatchExperience(
        self, request: Any, context: grpc.aio.ServicerContext
    ) -> Any:
        """Match experiences based on query"""
        try:
            experiences = await self.experience_service.match(
                request.query,
                request.category,
                request.complexity,
                request.limit,
            )

            response = document_pb2.ExperienceMatchResponse()
            for exp in experiences:
                response.experiences.append(document_pb2.Experience(
                    id=str(exp.get("id", "")),
                    type=exp.get("type", ""),
                    category=exp.get("category", ""),
                    title=exp.get("title", ""),
                    description=exp.get("description", ""),
                    complexity=exp.get("complexity", ""),
                    relevance_score=exp.get("relevance_score", 0.0),
                ))

            return response
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return document_pb2.ExperienceMatchResponse()

    async def AddExperience(
        self, request: Any, context: grpc.aio.ServicerContext
    ) -> Any:
        """Add a new experience"""
        try:
            code_files = []
            for cf in request.code_files:
                code_files.append({
                    "path": cf.path,
                    "language": cf.language,
                    "content": cf.content,
                })

            experience = await self.experience_service.add(
                user_id=request.user_id,
                project_id=request.project_id,
                exp_type=request.type,
                category=request.category,
                title=request.title,
                description=request.description,
                content=request.content,
                code_files=code_files,
            )

            return document_pb2.Experience(
                id=str(experience.get("id", "")),
                type=experience.get("type", ""),
                category=experience.get("category", ""),
                title=experience.get("title", ""),
                description=experience.get("description", ""),
                complexity=experience.get("complexity", ""),
                relevance_score=0.0,
            )
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return document_pb2.Experience()

    def _to_structured_content(self, data: dict) -> Any:
        """Convert dict to StructuredContent proto"""
        structured = document_pb2.StructuredContent(
            content_type=data.get("content_type", ""),
            summary=data.get("summary", ""),
        )
        for feature in data.get("features", []):
            structured.features.append(document_pb2.FeatureItem(
                name=feature.get("name", ""),
                description=feature.get("description", ""),
                priority=feature.get("priority", "medium"),
                tags=feature.get("tags", []),
            ))
        for ui in data.get("ui_elements", []):
            structured.ui_elements.append(document_pb2.UIElement(
                name=ui.get("name", ""),
                type=ui.get("type", ""),
                description=ui.get("description", ""),
            ))
        for field in data.get("data_fields", []):
            structured.data_fields.append(document_pb2.DataField(
                name=field.get("name", ""),
                type=field.get("type", ""),
                description=field.get("description", ""),
                required=field.get("required", False),
            ))
        for ref in data.get("references", []):
            structured.references.append(document_pb2.Reference(
                type=ref.get("type", ""),
                url=ref.get("url", ""),
                description=ref.get("description", ""),
            ))
        return structured

    def _from_structured_content(self, proto: Any) -> dict:
        """Convert StructuredContent proto to dict"""
        return {
            "content_type": proto.content_type,
            "summary": proto.summary,
            "features": [
                {
                    "name": f.name,
                    "description": f.description,
                    "priority": f.priority,
                    "tags": list(f.tags),
                }
                for f in proto.features
            ],
            "ui_elements": [
                {
                    "name": ui.name,
                    "type": ui.type,
                    "description": ui.description,
                }
                for ui in proto.ui_elements
            ],
            "data_fields": [
                {
                    "name": df.name,
                    "type": df.type,
                    "description": df.description,
                    "required": df.required,
                }
                for df in proto.data_fields
            ],
            "references": [
                {
                    "type": ref.type,
                    "url": ref.url,
                    "description": ref.description,
                }
                for ref in proto.references
            ],
        }
